"use client";

import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import getAttendanceSummary from "../../utils/attendanceUtils";

export default function AdminSalary() {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [totalNetSalary, setTotalNetSalary] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    async function fetchData() {
      try {
        const empRes = await fetch("/api/employee/getEmployees");
        const attRes = await fetch("/api/attendance/get");

        const empData = await empRes.json();
        const attData = await attRes.json();

        setEmployees(empData || []);
        setAttendance(attData.data || attData || []);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    }
    fetchData();
  }, []);

  const totalDays = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const today =
    selectedMonth === new Date().getMonth() &&
    selectedYear === new Date().getFullYear()
      ? new Date().getDate()
      : totalDays;

  const employeesWithSalary = employees.map((emp) => {
    const monthlySalary = emp.salary ? Number(emp.salary) : 0;
    const perDaySalary = monthlySalary / totalDays;

    const empAttendance = attendance.filter(
      (att) =>
        att.email === emp.email &&
        new Date(att.date).getMonth() === selectedMonth &&
        new Date(att.date).getFullYear() === selectedYear
    );

    if (empAttendance.length === 0) {
      return {
        ...emp,
        monthlySalary,
        grossSalary: 0,
        totalDeduction: 0,
        netSalary: 0,
        present: 0,
        half: 0,
        leave: 0,
        unpaidLeaves: 0,
        unpaidHalfDays: 0,
        paidHalfDaysUsed: 0,
      };
    }

    const {
      present,
      half,
      leave,
      unpaidLeaves,
      unpaidHalfDays,
      paidHalfDaysUsed,
    } = getAttendanceSummary(
      attendance,
      selectedMonth,
      selectedYear,
      today,
      true,
      emp.email
    );

    const grossSalaryTillToday = perDaySalary * today;
    const totalDeduction =
      unpaidLeaves * perDaySalary + unpaidHalfDays * 0.5 * perDaySalary;

    const netSalary = grossSalaryTillToday - totalDeduction;

    return {
      ...emp,
      monthlySalary,
      grossSalary: grossSalaryTillToday,
      totalDeduction,
      netSalary,
      present,
      half,
      leave,
      unpaidLeaves,
      unpaidHalfDays,
      paidHalfDaysUsed,
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
      {
        month: "long",
        year: "numeric",
      }
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
      emp.monthlySalary.toFixed(2),
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
          "Monthly Salary",
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
      `Total Net Salary This Month: ₹${totalNetSalary.toFixed(2)}`,
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
      {/* Header */}
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
        Total Net Salary: ₹{totalNetSalary.toFixed(2)}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded shadow">
        <table className="min-w-full bg-white border text-sm md:text-base">
          <thead className="bg-blue-100 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-2 text-left border">ID</th>
              <th className="px-4 py-2 text-left border">Name</th>
              <th className="px-4 py-2 text-left border">Email</th>
              <th className="px-4 py-2 text-left border">Number</th>
              <th className="px-4 py-2 text-left border">Monthly Salary</th>
              <th className="px-4 py-2 text-left border">Total Deduction</th>
              <th className="px-4 py-2 text-left border">Net Salary</th>
            </tr>
          </thead>
          <tbody>
            {employeesWithSalary.map((emp) => (
              <tr
                key={emp.id}
                className="hover:bg-gray-50 transition duration-200"
              >
                <td className="px-4 py-2 border">{emp.id}</td>
                <td className="px-4 py-2 border">{emp.name}</td>
                <td className="px-4 py-2 border">{emp.email}</td>
                <td className="px-4 py-2 border">{emp.number}</td>
                <td className="px-4 py-2 border text-green-600">
                  ₹{emp.monthlySalary.toFixed(2)}
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
    </main>
  );
}
