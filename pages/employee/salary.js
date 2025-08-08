"use client";

import React, { useEffect, useState } from "react";
import { db } from "../../lib/firebase"; // Your Firebase client SDK instance
import { ref, get } from "firebase/database";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import getAttendanceSummary from "../../utils/attendanceUtils";

export default function EmployeeSalary() {
  const [attendance, setAttendance] = useState([]);
  const [employee, setEmployee] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [loading, setLoading] = useState(true);

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

        // 1. Fetch employees from Firebase and find matching by email
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

        // 2. Fetch all attendance from Firebase
        const attendanceSnap = await get(ref(db, "attendance"));
        if (!attendanceSnap.exists()) {
          setAttendance([]);
        } else {
          // attendance data structure is by date keys with objects of employee attendance
          // Flatten all attendance records from all dates into one array
          const attendanceObj = attendanceSnap.val();

          const attendanceArr = Object.values(attendanceObj).flatMap((dateRecord) =>
            Object.values(dateRecord)
          );
          setAttendance(attendanceArr);
        }
      } catch (error) {
        console.error("Error fetching data from Firebase:", error);
        setEmployee(null);
        setAttendance([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-10 text-gray-500">Loading...</div>
    );
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

  const attendanceDaysCount =
    monthToShow === currentMonth ? today : totalDaysInMonth;

  const {
    present,
    half,
    leave,
    unpaidLeaves,
    unpaidHalfDays,
  } = getAttendanceSummary(
    attendance,
    monthToShow,
    currentYear,
    attendanceDaysCount,
    true,
    employee.email
  );

  const attendanceExists = present + half > 0;

  const perDaySalary = monthlySalary / totalDaysInMonth;

  const daysCounted = attendanceDaysCount;

  let grossSalaryTillToday = 0;
  let totalDeduction = 0;
  let netSalary = 0;

  if (attendanceExists) {
    grossSalaryTillToday = perDaySalary * daysCounted;
    totalDeduction =
      unpaidLeaves * perDaySalary + unpaidHalfDays * 0.5 * perDaySalary;
    netSalary = grossSalaryTillToday - totalDeduction;
  }

  const generatePDFForMonth = (monthIndex) => {
    const selectedDate = new Date(currentYear, monthIndex, 1);
    const totalDaysInSelectedMonth = new Date(
      currentYear,
      monthIndex + 1,
      0
    ).getDate();

    const pdfAttendanceDaysCount =
      monthIndex === currentMonth ? today : totalDaysInSelectedMonth;

    const {
      present,
      half,
      leave,
      unpaidLeaves,
      unpaidHalfDays,
    } = getAttendanceSummary(
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

          {/* <div>
            {selectedMonth === currentMonth ? "Gross Till Today:" : "Gross:"}
          </div>
          <div className="font-semibold text-green-600">
            ₹ {grossSalaryTillToday.toFixed(2)}
          </div> */}

          <div> Total Leave:</div>
          <div className="text-red-600 font-semibold">{leave} (1 Paid)</div>


          <div>Unpaid Leaves:</div>
          <div className="font-semibold text-red-700">{unpaidLeaves}</div>

          <div>Half Days:</div>
          <div className="text-orange-600 font-semibold">{half} </div>
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
