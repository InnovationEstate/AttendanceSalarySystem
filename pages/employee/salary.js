
"use client";

import React, { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { ref, get } from "firebase/database";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import getAttendanceSummary from "../../utils/attendanceUtils";

export default function EmployeeSalary() {
  const [attendance, setAttendance] = useState([]);
  const [employee, setEmployee] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [holidays, setHolidays] = useState([]); // store holidays list
  const [weekOffSet, setWeekOffSet] = useState(new Set());
  const [approvedLeavesSet, setApprovedLeavesSet] = useState(new Set());

  const now = new Date();
  const today = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const empLocal = JSON.parse(localStorage.getItem("employee"));
        if (!empLocal?.email) {
          setLoading(false);
          return;
        }

        // 1. Fetch employees and find full record
        const employeesSnap = await get(ref(db, "employees"));
        if (!employeesSnap.exists()) {
          setEmployee(null);
          setLoading(false);
          return;
        }
        const employeesArray = Object.values(employeesSnap.val());
        const fullEmployee = employeesArray.find(
          (e) => e.email.toLowerCase() === empLocal.email.toLowerCase()
        );
        setEmployee(fullEmployee || null);

        // 2. Fetch attendance
        const attendanceSnap = await get(ref(db, "attendance"));
        if (!attendanceSnap.exists()) {
          setAttendance([]);
        } else {
          const attendanceObj = attendanceSnap.val();
          const attendanceArr = Object.entries(attendanceObj).flatMap(([dateKey, dateRecord]) =>
            Object.entries(dateRecord || {}).map(([userKey, rec]) => {
              return {
                ...rec,
                date: dateKey,
                email: rec.email || (rec.emailAddress && rec.emailAddress) || "",
              };
            })
          );
          setAttendance(attendanceArr);
        }

        // 3. Fetch holidays
        const holidaysSnap = await get(ref(db, "companyHolidays"));
        if (holidaysSnap.exists()) {
          const data = holidaysSnap.val();
          const holidaysList = Object.keys(data).map((date) => date);
          setHolidays(holidaysList);
        } else {
          setHolidays([]);
        }

        // 4. Fetch weekOffs
        const empId = fullEmployee?.id || empLocal.id || null;
        if (empId) {
          const weekOffSnap = await get(ref(db, `weekoffs/${empId}`));
          if (weekOffSnap.exists()) {
            const wData = weekOffSnap.val() || {};
            const wSet = new Set(Object.keys(wData));
            setWeekOffSet(wSet);
          } else {
            setWeekOffSet(new Set());
          }
        } else {
          setWeekOffSet(new Set());
        }

        // 5. Fetch leaveRequests
        const leaveSnap = await get(ref(db, "leaveRequests"));
        if (leaveSnap.exists()) {
          const leaveData = leaveSnap.val() || {};
          const leavesArray = Object.values(leaveData);
          const approvedDates = leavesArray
            .filter(
              (lr) =>
                lr &&
                String(lr.email || "").toLowerCase() === empLocal.email.toLowerCase() &&
                lr.status === "approved" &&
                (lr.type === "full-day" || !lr.type)
            )
            .map((lr) => lr.date);
          setApprovedLeavesSet(new Set(approvedDates));
        } else {
          setApprovedLeavesSet(new Set());
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setEmployee(null);
        setAttendance([]);
        setHolidays([]);
        setWeekOffSet(new Set());
        setApprovedLeavesSet(new Set());
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return <div className="text-center py-10 text-gray-500">Loading...</div>;
  }

  if (!employee) {
    return (
      <div className="text-center py-10 text-red-600 font-semibold">
        Employee data not found. Please login again.
      </div>
    );
  }

  const monthlySalary = Number(employee.salary) || 0;
  const monthToShow = selectedMonth !== null ? selectedMonth : currentMonth;
  const totalDaysInMonth = new Date(currentYear, monthToShow + 1, 0).getDate();
  const attendanceDaysCount = monthToShow === currentMonth ? today : totalDaysInMonth;

  const holidayDatesSet = new Set(
    holidays.filter((dateStr) => {
      const d = new Date(dateStr);
      return d.getMonth() === monthToShow && d.getFullYear() === currentYear;
    })
  );

  const filteredWeekOffSet = new Set(
    Array.from(weekOffSet).filter((d) => {
      const x = new Date(d);
      return x.getMonth() === monthToShow && x.getFullYear() === currentYear && x.getDate() <= attendanceDaysCount;
    })
  );

  const filteredApprovedLeavesSet = new Set(
    Array.from(approvedLeavesSet).filter((d) => {
      const x = new Date(d);
      return x.getMonth() === monthToShow && x.getFullYear() === currentYear && x.getDate() <= attendanceDaysCount;
    })
  );

  // Attendance Summary
  let {
    present,
    half,
    leave,
    absent,
    unpaidLeaves,
    paidLeavesUsed,
    paidHalfDaysUsed,
    unpaidHalfDays,
    weekOff,
    detailedDays,
  } = getAttendanceSummary(
    attendance,
    monthToShow,
    currentYear,
    attendanceDaysCount,
    true,
    employee.email,
    holidayDatesSet,
    filteredWeekOffSet,
    filteredApprovedLeavesSet
  );

  // --- NEW LOGIC: 1 absent auto-paid if no paid leave used ---
  if (absent > 0 && paidLeavesUsed === 0) {
    absent -= 1;
    paidLeavesUsed += 1;
  }

  const perDaySalary = monthlySalary / totalDaysInMonth;
  const daysCounted = attendanceDaysCount;

  const holidaysCount = holidays.filter((dateStr) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    return d.getMonth() === monthToShow && d.getFullYear() === currentYear && day <= daysCounted;
  }).length;

  const grossSalaryTillToday = perDaySalary * daysCounted;

  const totalDeduction =
    (unpaidLeaves + absent) * perDaySalary + unpaidHalfDays * 0.5 * perDaySalary;

  const netSalary = grossSalaryTillToday - totalDeduction;

  const generatePDFForMonth = (monthIndex) => {
    const selectedDate = new Date(currentYear, monthIndex, 1);
    const totalDaysInSelectedMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
    const pdfAttendanceDaysCount = monthIndex === currentMonth ? today : totalDaysInSelectedMonth;

    const holidayDatesSetForPDF = new Set(
      holidays.filter((dateStr) => {
        const d = new Date(dateStr);
        return d.getMonth() === monthIndex && d.getFullYear() === currentYear;
      })
    );

    const filteredWeekOffForPDF = new Set(
      Array.from(weekOffSet).filter((d) => {
        const x = new Date(d);
        return x.getMonth() === monthIndex && x.getFullYear() === currentYear && x.getDate() <= pdfAttendanceDaysCount;
      })
    );

    const filteredApprovedLeavesForPDF = new Set(
      Array.from(approvedLeavesSet).filter((d) => {
        const x = new Date(d);
        return x.getMonth() === monthIndex && x.getFullYear() === currentYear && x.getDate() <= pdfAttendanceDaysCount;
      })
    );

    let {
      present: pdfPresent,
      half: pdfHalf,
      leave: pdfLeave,
      absent: pdfAbsent,
      unpaidLeaves: pdfUnpaidLeaves,
      unpaidHalfDays: pdfUnpaidHalfDays,
      weekOff: pdfWeekOff,
      paidLeavesUsed: pdfPaidLeavesUsed,
    } = getAttendanceSummary(
      attendance,
      monthIndex,
      currentYear,
      pdfAttendanceDaysCount,
      true,
      employee.email,
      holidayDatesSetForPDF,
      filteredWeekOffForPDF,
      filteredApprovedLeavesForPDF
    );

    // --- Apply same absent-to-paid rule in PDF ---
    if (pdfAbsent > 0 && pdfPaidLeavesUsed === 0) {
      pdfAbsent -= 1;
      pdfPaidLeavesUsed += 1;
    }

    const perDay = monthlySalary / totalDaysInSelectedMonth;
    const gross = perDay * pdfAttendanceDaysCount;
    const deduction = (pdfUnpaidLeaves + pdfAbsent) * perDay + pdfUnpaidHalfDays * 0.5 * perDay;
    const net = gross - deduction;

    const doc = new jsPDF();
    const monthStr = selectedDate.toLocaleString("default", { month: "long", year: "numeric" });

    doc.setFontSize(18);
    doc.text("Innovation Estate", 14, 20);
    doc.setFontSize(12);
    doc.text("Salary Slip", 14, 30);
    doc.text(`Month: ${monthStr}`, 14, 36);
    doc.text(`Employee: ${employee.name}`, 14, 42);
    doc.text(`Email: ${employee.email}`, 14, 48);
    doc.text(`Employee ID: ${employee.id}`, 14, 54);

    autoTable(doc, {
      startY: 60,
      theme: "striped",
      head: [["Description", "Value"]],
      body: [
        ["Monthly Salary", `${monthlySalary.toFixed(2)}`],
        ["Days Counted", `${pdfAttendanceDaysCount}`],
        ["Per Day Salary", `${perDay.toFixed(2)}`],
        ["Gross Salary", `${gross.toFixed(2)}`],
        ["Present Days", pdfPresent],
        ["Half Days", pdfHalf],
        ["Week Offs", pdfWeekOff],
        ["Paid Leaves (used)", pdfPaidLeavesUsed],
        ["Unpaid Leaves", pdfUnpaidLeaves],
        ["Absents", pdfAbsent],
        ["Unpaid Half Days", pdfUnpaidHalfDays],
        ["Total Deduction", `${deduction.toFixed(2)}`],
        ["Net Salary", `${net.toFixed(2)}`],
        ["Paid Holidays", holidayDatesSetForPDF.size],
      ],
    });

    doc.save(`SalarySlip_${currentYear}_${monthIndex + 1}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-3 text-sm">
      <div className="max-w-2xl mx-auto flex flex-row justify-end items-center mb-4 gap-2">
        <select
          className="border border-gray-300 rounded px-2 py-1 bg-white shadow-sm text-sm"
          value={selectedMonth ?? ""}
          onChange={(e) => setSelectedMonth(e.target.value === "" ? null : Number(e.target.value))}
        >
          <option value="">Select Month</option>
          {[...Array(currentMonth + 1).keys()].map((m) => (
            <option key={m} value={m}>
              {new Date(currentYear, m).toLocaleString("default", { month: "long" })}
            </option>
          ))}
        </select>

        <button
          disabled={selectedMonth === null}
          onClick={() => generatePDFForMonth(selectedMonth)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded shadow text-sm disabled:opacity-50"
        >
          Download Selected
        </button>
      </div>

      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-4">
        <h2 className="text-xl sm:text-2xl font-bold text-center text-blue-700 mb-4">Salary Slip</h2>

        <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-6">
          <div>Month:</div>
          <div className="font-semibold">
            {new Date(currentYear, monthToShow).toLocaleString("default", { month: "long", year: "numeric" })}
          </div>

          <div>Monthly Salary:</div>
          <div className="font-semibold text-blue-700">₹ {monthlySalary.toFixed(2)}</div>

          <div>{selectedMonth === currentMonth ? "Days Till Today:" : "Days in Month:"}</div>
          <div className="font-semibold">{daysCounted}</div>

          <div>Per Day Salary:</div>
          <div className="font-semibold">₹ {perDaySalary.toFixed(2)}</div>

          <div>Present:</div>
          <div className="font-semibold text-green-700">{present}</div>

          <div>Absents:</div>
          <div className="font-semibold text-red-700">{absent}</div>

          <div>Half Days:</div>
          <div className="font-semibold text-orange-600">{half}</div>

          <div>Week Offs:</div>
          <div className="font-semibold text-gray-600">{weekOff}</div>

          <div>Paid Leaves Used:</div>
          <div className="font-semibold text-blue-600">{paidLeavesUsed}</div>

          <div>Unpaid Leaves:</div>
          <div className="font-semibold text-red-600">{unpaidLeaves}</div>

          {/* <div>Unpaid Half Days:</div>
          <div className="font-semibold text-red-500">{unpaidHalfDays}</div> */}

          <div>Holidays:</div>
          <div className="text-green-600 font-semibold">{holidaysCount}</div>
          

          <div>Total Deduction:</div>
          <div className="font-semibold text-red-600">₹ {totalDeduction.toFixed(2)}</div>


          <div className="text-base font-semibold">Net Salary:</div>
          <div className="text-green-700 text-base font-bold">₹ {netSalary.toFixed(2)}</div>
        </div>

        <div className="text-center">
          <button
            onClick={() => generatePDFForMonth(currentMonth)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow text-sm font-medium"
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
