"use client";

import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import getAttendanceSummary from "../../utils/attendanceUtils";

export default function EmployeeSalary() {
  const [attendance, setAttendance] = useState([]);
  const [employee, setEmployee] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);

  const now = new Date();
  const today = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  useEffect(() => {
    async function fetchData() {
      const empLocal = JSON.parse(localStorage.getItem("employee"));
      if (!empLocal) return;

      const empRes = await fetch("/api/employee/getEmployees");
      const empData = await empRes.json();
      const fullEmployee = empData.find((e) => e.email === empLocal.email);
      setEmployee(fullEmployee);

      const attRes = await fetch("/api/attendance/get");
      const attData = await attRes.json();
      setAttendance(attData.data || []);
    }

    fetchData();
  }, []);

  if (!employee) {
    return <div className="text-center py-10 text-gray-500">Loading...</div>;
  }

  const monthlySalary = Number(employee.salary) || 0;

  // Month to display salary for
  const monthToShow = selectedMonth !== null ? selectedMonth : currentMonth;

  // Total days in that month
  const totalDaysInMonth = new Date(currentYear, monthToShow + 1, 0).getDate();

  // Use today's date if current month; else full month days for attendance summary
  const attendanceDaysCount =
    monthToShow === currentMonth ? today : totalDaysInMonth;

  // Get attendance summary for selected month & days
  const { present, half, leave, unpaidLeaves, unpaidHalfDays } =
    getAttendanceSummary(
      attendance,
      monthToShow,
      currentYear,
      attendanceDaysCount,
      true,
      employee.email
    );

  // Employee considered present if present or half days > 0
  const attendanceExists = present + half > 0;

  // Per day salary based on full month days
  const perDaySalary = monthlySalary / totalDaysInMonth;

  // Days counted for salary calculation (partial month or full month)
  const daysCounted = attendanceDaysCount;

  // Initialize salary variables
  let grossSalaryTillToday = 0;
  let totalDeduction = 0;
  let netSalary = 0;

  if (attendanceExists) {
    grossSalaryTillToday = perDaySalary * daysCounted;
    totalDeduction =
      unpaidLeaves * perDaySalary + unpaidHalfDays * 0.5 * perDaySalary;
    netSalary = grossSalaryTillToday - totalDeduction;
  }

  // PDF generation function
  const generatePDFForMonth = (monthIndex) => {
    const selectedDate = new Date(currentYear, monthIndex, 1);
    const totalDaysInSelectedMonth = new Date(
      currentYear,
      monthIndex + 1,
      0
    ).getDate();

    const pdfAttendanceDaysCount =
      monthIndex === currentMonth ? today : totalDaysInSelectedMonth;

    const { present, half, leave, unpaidLeaves, unpaidHalfDays } =
      getAttendanceSummary(
        attendance,
        monthIndex,
        currentYear,
        pdfAttendanceDaysCount,
        true,
        employee.email
      );

    const attendanceExistsForPDF = present + half > 0;

    const perDay = monthlySalary / totalDaysInSelectedMonth;

    const gross = attendanceExistsForPDF ? perDay * pdfAttendanceDaysCount : 0;
    const deduction = attendanceExistsForPDF
      ? unpaidLeaves * perDay + unpaidHalfDays * 0.5 * perDay
      : 0;
    const net = gross - deduction;

    const doc = new jsPDF();
    const monthStr = selectedDate.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });

    doc.setFontSize(18);
    doc.text("Innovation Estate", 14, 20);
    doc.setFontSize(12);
    doc.text(`Salary Slip`, 14, 30);
    doc.text(`Month: ${monthStr}`, 14, 36);
    doc.text(`Employee: ${employee.name}`, 14, 42);

    autoTable(doc, {
      startY: 55,
      theme: "striped",
      head: [["Description", "Value"]],
      body: [
        ["Monthly Salary", `${monthlySalary.toFixed(2)}`],
        ["Days Counted", `${pdfAttendanceDaysCount}`],
        ["Per Day Salary", `${perDay.toFixed(2)}`],
        ["Gross Salary", `${gross.toFixed(2)}`],
        ["Leave Days (1 Paid)", leave],
        ["Half Days", half],
        ["Unpaid Leaves", unpaidLeaves],
        ["Total Deduction", `${deduction.toFixed(2)}`],
        ["Net Salary", `${net.toFixed(2)}`],
      ],
    });

    doc.save(`SalarySlip_${currentYear}_${monthIndex + 1}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-3 text-sm">
      {/* 🔽 Controls */}
      <div className="max-w-2xl mx-auto flex flex-row justify-end items-center mb-4 gap-2">
        <select
          className="border border-gray-300 rounded px-2 py-1 bg-white shadow-sm text-sm"
          value={selectedMonth ?? ""}
          onChange={(e) =>
            setSelectedMonth(
              e.target.value === "" ? null : Number(e.target.value)
            )
          }
        >
          <option value="">Select Month</option>
          {[...Array(currentMonth + 1).keys()].map((m) => (
            <option key={m} value={m}>
              {new Date(currentYear, m).toLocaleString("default", {
                month: "long",
              })}
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

      {/* 🔽 Salary Slip Card */}
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-4">
        <h2 className="text-xl sm:text-2xl font-bold text-center text-blue-700 mb-4">
          Salary Slip
        </h2>

        <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-6">
          <div>Month:</div>
          <div className="font-semibold">
            {new Date(currentYear, monthToShow).toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </div>

          <div>Monthly Salary:</div>
          <div className="font-semibold text-blue-700">
            ₹ {monthlySalary.toFixed(2)}
          </div>

          <div>
            {selectedMonth === currentMonth
              ? "Days Till Today:"
              : "Days in Month:"}
          </div>
          <div className="font-semibold">{daysCounted}</div>

          <div>Per Day Salary:</div>
          <div className="font-semibold">₹ {perDaySalary.toFixed(2)}</div>

          <div>
            {selectedMonth === currentMonth ? "Gross Till Today:" : "Gross:"}
          </div>
          <div className="font-semibold text-green-600">
            ₹ {grossSalaryTillToday.toFixed(2)}
          </div>

          <div>Leave Days:</div>
          <div className="text-red-600 font-semibold">{leave} (1 Paid)</div>

          <div>Half Days:</div>
          <div className="text-orange-600 font-semibold">{half} (1 Paid)</div>

          <div>Unpaid Leaves:</div>
          <div className="font-semibold text-red-700">{unpaidLeaves}</div>

          <div>Total Deduction:</div>
          <div className="font-semibold text-red-600">
            ₹ {totalDeduction.toFixed(2)}
          </div>

          <div className="text-base font-semibold">Net Salary:</div>
          <div className="text-green-700 text-base font-bold">
            ₹ {netSalary.toFixed(2)}
          </div>
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
