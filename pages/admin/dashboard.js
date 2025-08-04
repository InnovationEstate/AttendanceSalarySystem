"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function AdminDashboard() {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    leave: 0,
    halfDay: 0,
    paidLeave: 0,
    unpaidLeave: 0,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [modalList, setModalList] = useState([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const empRes = await fetch("/api/employee/getEmployees");
        if (!empRes.ok) throw new Error("Failed to fetch employees");
        const empData = await empRes.json();

        const attRes = await fetch("/api/attendance/get");
        if (!attRes.ok) throw new Error("Failed to fetch attendance");
        const attData = await attRes.json();

        const attendanceArray = attData.data || attData;

        setEmployees(empData);
        setAttendance(attendanceArray);

        calculateSummary(empData, attendanceArray);
      } catch (err) {
        console.error(err);
      }
    }

    fetchData();
  }, []);

  function getTodayDate() {
    const now = new Date();
    return now.toISOString().split("T")[0];
  }

  function getRawLoginMinutes(loginStr) {
    if (!loginStr) return null;
    const login = new Date(loginStr);
    if (isNaN(login)) return null;
    return login.getHours() * 60 + login.getMinutes();
  }

  function calculateSummary(empData, attData) {
    const todayDate = getTodayDate();
    const totalEmployees = empData.length;

    const todaysAttendance = attData.filter(
      (entry) => entry.date === todayDate
    );
    const attendanceMap = new Map();
    todaysAttendance.forEach((entry) => {
      if (entry.email) attendanceMap.set(entry.email.toLowerCase(), entry);
    });

    let presentToday = 0;
    let halfDay = 0;
    let leave = 0;
    let paidLeave = 0;
    let unpaidLeave = 0;
    let absentToday = 0;

    const now = new Date();
    const isTuesday =
      now.toLocaleString("en-US", { weekday: "long" }) === "Tuesday";

    empData.forEach((emp) => {
      const email = emp.email?.toLowerCase();
      const record = attendanceMap.get(email);

      if (!record) {
        if (!isTuesday) absentToday++;
        return;
      }

      const loginMinutes = getRawLoginMinutes(record.login);

      if (loginMinutes === null) {
        leave++;
        unpaidLeave++;
        return;
      }

      if (loginMinutes <= 660) {
        presentToday++;
      } else if (loginMinutes <= 1120) {
        halfDay++;
      } else {
        leave++;
        unpaidLeave++;
      }
    });

    setSummary({
      totalEmployees,
      presentToday,
      absentToday,
      leave,
      halfDay,
      paidLeave,
      unpaidLeave,
    });
  }

  const handleCardClick = (type) => {
    const today = getTodayDate();
    const map = new Map();
    attendance.forEach((entry) => {
      if (entry.date === today && entry.email) {
        map.set(entry.email.toLowerCase(), entry);
      }
    });

    const now = new Date();
    const isTuesday =
      now.toLocaleString("en-US", { weekday: "long" }) === "Tuesday";

    let list = [];

    employees.forEach((emp) => {
      const email = emp.email?.toLowerCase();
      const record = map.get(email);
      const loginMinutes = getRawLoginMinutes(record?.login);

      switch (type) {
        case "Present":
          if (loginMinutes !== null && loginMinutes <= 660) list.push(emp);
          break;
        case "Half Day":
          if (
            loginMinutes !== null &&
            loginMinutes > 660 &&
            loginMinutes <= 1120
          )
            list.push(emp);
          break;
        case "Absent":
          if (!record && !isTuesday) list.push(emp);
          break;
        case "Leave":
          if (loginMinutes === null && record) list.push(emp);
          break;
        default:
          break;
      }
    });

    setModalType(type);
    setModalList(list);
    setModalOpen(true);
  };

 const StatCard = ({ title, value, clickable = false }) => (
  <div
    className={`bg-white border border-gray-200 rounded-md px-3 py-4 text-center shadow-sm transition-all duration-200 ${
      clickable ? "cursor-pointer hover:shadow-md" : ""
    }`}
    onClick={() => clickable && handleCardClick(title)}
  >
    <div className="text-lg sm:text-xl font-semibold text-blue-700 leading-tight">
      {value}
    </div>
    <div className="text-xs sm:text-sm text-gray-700 mt-1 font-medium">
      {title}
    </div>
  </div>
);


return (
  <main className="p-4 sm:p-6 bg-gray-100 min-h-screen">
    <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-800 mb-6">
      Admin Dashboard
    </h1>

    {/* Row 1: Total, Present, Absent */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
      <StatCard title="Total Employees" value={summary.totalEmployees} />
      <StatCard title="Present" value={summary.presentToday} clickable />
      <StatCard title="Absent" value={summary.absentToday} clickable />
    </div>

    {/* Row 2: Leave, Paid Leave, Unpaid Leave */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
      <StatCard title="Leave" value={summary.leave} clickable />
      <StatCard title="Paid Leave" value={summary.paidLeave} />
      <StatCard title="Unpaid Leave" value={summary.unpaidLeave} />
    </div>

    {/* Row 3: Half Day */}
    <div className="flex justify-center">
      <div className="w-full sm:w-1/3">
        <StatCard title="Half Day" value={summary.halfDay} clickable />
      </div>
    </div>

    {/* Modal Section */}
    {modalOpen && (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white border border-gray-300 rounded-lg w-full max-w-md shadow-xl max-h-[75vh] overflow-y-auto p-6">
          <div className="flex justify-between items-center border-b pb-2 mb-4">
            <h2 className="text-lg font-medium text-blue-700">
              {modalType} Employees
            </h2>
            <button
              onClick={() => setModalOpen(false)}
              className="text-blue-600 hover:text-blue-800 text-xl font-bold"
            >
              ×
            </button>
          </div>

          {modalList.length > 0 ? (
            <ul className="space-y-2">
              {modalList.map((emp, idx) => (
                <li
                  key={idx}
                  className="p-3 bg-gray-50 rounded border border-gray-200 shadow-sm"
                >
                  <div className="text-xs text-gray-500">{emp.id}</div>
                  <div className="text-sm font-semibold text-gray-800">
                    {emp.name}
                  </div>
                  <div className="text-xs text-gray-600">{emp.email}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600">
              No employees found for this category.
            </p>
          )}
        </div>
      </div>
    )}
  </main>
);
}
