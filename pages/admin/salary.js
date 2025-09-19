"use client";

import React, { useEffect, useState, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import getAttendanceSummary from "../../utils/attendanceUtils";
import { getDatabase, ref, get, child } from "firebase/database";
import { app } from "../../lib/firebase";

export default function AdminSalary() {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [weekOffData, setWeekOffData] = useState({});
  const [totalNetSalary, setTotalNetSalary] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRowClick = (emp) => {
    setSelectedEmployee(emp);
    setIsModalOpen(true);
  };

  useEffect(() => {
    const db = getDatabase(app);
    const dbRef = ref(db);

    async function fetchData() {
      try {
        // Employees
        const empSnap = await get(child(dbRef, "employees"));
        const empList = empSnap.exists() ? Object.values(empSnap.val()) : [];

        // Attendance
        const attSnap = await get(child(dbRef, "attendance"));
        const attList = [];
        if (attSnap.exists()) {
          const attendanceData = attSnap.val();
          Object.entries(attendanceData).forEach(([date, entry]) => {
            Object.values(entry).forEach((record) => {
              attList.push(record);
            });
          });
        }

        // Holidays
        const holidaysSnap = await get(child(dbRef, "companyHolidays"));
        const holidaysList = holidaysSnap.exists()
          ? Object.keys(holidaysSnap.val())
          : [];

        // Leave Requests
        const leaveSnap = await get(child(dbRef, "leaveRequests"));
        const leaveList = leaveSnap.exists()
          ? Object.values(leaveSnap.val())
          : [];

        // Week Offs
        const weekOffSnap = await get(child(dbRef, "weekoffs"));
        const weekOffObj = weekOffSnap.exists() ? weekOffSnap.val() : {};

        setEmployees(empList || []);
        setAttendance(attList || []);
        setHolidays(holidaysList || []);
        setLeaveRequests(leaveList || []);
        setWeekOffData(weekOffObj || {});
      } catch (err) {
        console.error("Firebase fetch error:", err);
      }
    }

    fetchData();
  }, []);

  // ✅ Calculate days till today (if current month), otherwise full month
  const totalDaysInMonth = new Date(
    selectedYear,
    selectedMonth + 1,
    0
  ).getDate();
  const daysTillToday =
    selectedMonth === new Date().getMonth() &&
    selectedYear === new Date().getFullYear()
      ? new Date().getDate()
      : totalDaysInMonth;

  // Filter holidays for this month
  const holidayDatesSet = useMemo(
    () =>
      new Set(
        holidays.filter((dateStr) => {
          const d = new Date(dateStr);
          return (
            d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
          );
        })
      ),
    [holidays, selectedMonth, selectedYear]
  );

  function getSalaryForMonth(emp, year, month) {
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`; // YYYY-MM
  let salary = "";

  if (emp.salary && typeof emp.salary === "object") {
    const months = Object.keys(emp.salary)
      .filter((m) => m <= monthKey) // only months <= selected month
      .sort(); // ascending order

    if (months.length > 0) {
      const lastApplicableMonth = months[months.length - 1];
      salary = Number(emp.salary[lastApplicableMonth] || 0);
    }
  } else {
    salary = Number(emp.salary || 0);
  }

  return salary;
}


  const employeesWithSalary = employees.map((emp) => {
const monthlySalary = getSalaryForMonth(emp, selectedYear, selectedMonth);

    // Build weekOff set for this emp
    const weekOffSet = new Set(
      Object.keys(weekOffData[emp.id] || {}).filter((dateStr) => {
        const d = new Date(dateStr);
        return (
          weekOffData[emp.id][dateStr] === true &&
          d.getMonth() === selectedMonth &&
          d.getFullYear() === selectedYear
        );
      })
    );

    // Build approved leaves set for this emp
    const approvedLeavesSet = new Set(
      leaveRequests
        .filter(
          (lr) =>
            lr.email === emp.email &&
            lr.status === "approved" &&
            new Date(lr.startDate).getMonth() === selectedMonth &&
            new Date(lr.startDate).getFullYear() === selectedYear
        )
        .map((lr) => lr.startDate)
    );

    // --- Attendance Summary (only till today) ---
    let summary = getAttendanceSummary(
      attendance,
      selectedMonth,
      selectedYear,
      daysTillToday,
      true,
      emp.email,
      holidayDatesSet,
      weekOffSet,
      approvedLeavesSet
    );

    // --- ✅ Apply "1 Absent Paid Rule" ---
    if (summary.absent > 0 && summary.paidLeavesUsed === 0) {
      summary.absent -= 1;
      summary.paidLeavesUsed += 1;
    }

    // --- Salary Calculation ---
    const effectiveDays = daysTillToday - summary.weekOff; // working days till today excluding weekoffs
    const perDaySalary = monthlySalary / totalDaysInMonth; // base on full month
    const grossSalaryTillToday = perDaySalary * daysTillToday; // proportional salary till today

    // Paid days count
    const payableDays =
      summary.present +
      summary.paidLeavesUsed +
      summary.paidHalfDaysUsed * 0.5 +
      summary.weekOff +
      summary.leave +
      (summary.holidays || 0);

    // Unpaid days count
    const unpaidDays =
      summary.absent + summary.unpaidLeaves + summary.unpaidHalfDays * 0.5;

    const totalDeduction = unpaidDays * perDaySalary;
    const netSalary = grossSalaryTillToday - totalDeduction;

    return {
      ...emp,
      monthlySalary,
      grossSalary: grossSalaryTillToday,
      totalDeduction,
      netSalary,
      ...summary,
    };
  });

  useEffect(() => {
    const totalNet = employeesWithSalary.reduce(
      (sum, emp) => sum + emp.netSalary,
      0
    );
    setTotalNetSalary(totalNet);
  }, [employeesWithSalary]);

  const generatePDF = () => {
    const doc = new jsPDF();

    const monthStr = new Date(selectedYear, selectedMonth).toLocaleString(
      "default",
      { month: "long", year: "numeric" }
    );

    doc.setFontSize(18);
    doc.text("Innovation Estate", 14, 20);
    doc.setFontSize(12);
    doc.text(`Salary Summary - ${monthStr}`, 14, 30);

    const tableData = employeesWithSalary.map((emp) => [
      emp.id || "N/A",
      emp.name || "N/A",
      emp.email || "N/A",
      emp.number || "N/A",
      emp.grossSalary.toFixed(2),
      emp.totalDeduction.toFixed(2),
      emp.netSalary.toFixed(2),
    ]);

    autoTable(doc, {
      startY: 40,
      head: [
        [
          "ID",
          "Name",
          "Email",
          "Number",
          "Gross Salary (Till Today)",
          "Total Deduction",
          "Net Salary",
        ],
      ],
      body: tableData,
      theme: "striped",
      styles: { fontSize: 10 },
    });

    const finalY = doc.lastAutoTable.finalY || 40;
    doc.setFontSize(14);
    doc.text(
      `Total Net Salary Till Today: ₹${totalNetSalary.toFixed(2)}`,
      14,
      finalY + 15
    );

    doc.save(`SalarySummary_${selectedYear}_${selectedMonth + 1}.pdf`);
  };

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    label: new Date(0, i).toLocaleString("default", { month: "long" }),
    value: i,
  }));

  return (
    <main className="p-4 sm:p-6 bg-gray-100 min-h-screen text-sm md:text-base">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-800">
            Salary -{" "}
            <span className="font-bold text-black">
              {new Date(selectedYear, selectedMonth).toLocaleString("default", {
                month: "long",
                year: "numeric",
              })}
            </span>
          </h1>
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm bg-white"
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border rounded px-2 py-1 w-20 text-sm bg-white"
              min="2000"
              max="2099"
            />
          </div>
        </div>

        <div className="w-full md:w-auto">
          <button
            onClick={generatePDF}
            className="w-full md:w-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
          >
            Download Salary PDF
          </button>
        </div>
      </div>

      <div className="mb-4 text-lg text-green-700 font-semibold">
        Total Net Salary Till Today: ₹{totalNetSalary.toFixed(2)}
      </div>

      <div className="overflow-x-auto rounded shadow">
        <table className="min-w-full bg-white border text-sm md:text-base">
          <thead className="bg-blue-100 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-2 text-left border">ID</th>
              <th className="px-4 py-2 text-left border">Name</th>
              <th className="px-4 py-2 text-left border">Email</th>
              <th className="px-4 py-2 text-left border">Number</th>
              <th className="px-4 py-2 text-left border">
                Gross Salary (Till Today)
              </th>
              <th className="px-4 py-2 text-left border">Total Deduction</th>
              <th className="px-4 py-2 text-left border">Net Salary</th>
            </tr>
          </thead>
          <tbody>
            {employeesWithSalary.map((emp) => (
              <tr
                key={emp.id}
                className="hover:bg-gray-50 transition duration-200 hover:cursor-pointer"
                onClick={() => handleRowClick(emp)}
              >
                <td className="px-4 py-2 border">{emp.id}</td>
                <td className="px-4 py-2 border">{emp.name}</td>
                <td className="px-4 py-2 border">{emp.email}</td>
                <td className="px-4 py-2 border">{emp.number}</td>
                <td className="px-4 py-2 border text-green-600">
                  ₹{emp.grossSalary.toFixed(2)}
                </td>
                <td className="px-4 py-2 border text-red-600">
                  ₹{emp.totalDeduction.toFixed(2)}
                </td>
                <td className="px-4 py-2 border font-semibold">
                  ₹{emp.netSalary.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-black/60 bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-11/12 md:w-2/3 lg:w-1/2 p-6 relative">
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
              onClick={() => setIsModalOpen(false)}
            >
              X
            </button>

            <h2 className="text-xl sm:text-2xl font-bold text-center text-blue-700 mb-4">
              Salary Slip - {selectedEmployee.name}
            </h2>

            <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-6 text-sm md:text-base">
              <div>Month:</div>
              <div className="font-semibold">
                {new Date(selectedYear, selectedMonth).toLocaleString(
                  "default",
                  { month: "long", year: "numeric" }
                )}
              </div>

              <div>Monthly Salary:</div>
              <div className="font-semibold text-blue-700">
                ₹ {selectedEmployee.monthlySalary.toFixed(2)}
              </div>

              <div>
                {selectedMonth === new Date().getMonth()
                  ? "Days Till Today:"
                  : "Days in Month:"}
              </div>
              <div className="font-semibold">{daysTillToday}</div>

              <div>Per Day Salary:</div>
              <div className="font-semibold">
                ₹{" "}
                {(selectedEmployee.monthlySalary / totalDaysInMonth).toFixed(2)}
              </div>

              <div>Present:</div>
              <div className="font-semibold text-green-700">
                {selectedEmployee.present}
              </div>
            
              <div>Week Off:</div>
              <div className="font-semibold text-blue-600">
                {selectedEmployee.weekOff}
              </div>

               <div>Half Days:</div>
              <div className="font-semibold text-orange-600">
                {selectedEmployee.paidHalfDaysUsed +
                  selectedEmployee.unpaidHalfDays}
              </div>

              <div>Holidays:</div>
              <div className="text-green-600 font-semibold">
                {selectedEmployee.holidays || 0}
              </div>

              <div>Paid Leaves:</div>
              <div className="font-semibold text-blue-600">
                {selectedEmployee.paidLeavesUsed}
              </div>

              {/* <div>Unpaid Leaves:</div>
              <div className="font-semibold text-red-600">
                {selectedEmployee.unpaidLeaves}
              </div> */}

              <div>Absents:</div>
              <div className="font-semibold text-red-700">
                {selectedEmployee.absent}
              </div>

             
             
              <div>Total Deduction:</div>
              <div className="font-semibold text-red-600">
                ₹ {selectedEmployee.totalDeduction.toFixed(2)}
              </div>


              <div className="text-base font-semibold">Net Salary:</div>
              <div className="text-green-700 text-base font-bold">
                ₹ {selectedEmployee.netSalary.toFixed(2)}
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() =>
                  generatePDFForMonth(selectedMonth, selectedEmployee)
                }
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow text-sm font-medium"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
