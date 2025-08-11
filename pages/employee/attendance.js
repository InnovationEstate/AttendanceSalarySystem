"use client";
import React, { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { ref, get, child } from "firebase/database";
import getAttendanceSummary, {
  getISTDateString,
} from "../../utils/attendanceUtils";

export default function EmployeeAttendance() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [emp, setEmp] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);

  const statusColor = {
    Present: "bg-green-500",
    Absent: "bg-red-500",
    Leave: "bg-orange-500",
    "Half Day": "bg-yellow-500",
    "Week Off": "bg-gray-400",
    CH: "bg-blue-500", // Company Holiday
    Empty: "bg-transparent",
  };

  const fetchAttendance = async (monthIndex = null) => {
    const employee = JSON.parse(localStorage.getItem("employee"));
    if (!employee) return;

    setEmp(employee);
    setLoading(true);

    const dbRef = ref(db);
    const [attendanceSnap, holidaySnap] = await Promise.all([
      get(child(dbRef, `attendance`)),
      get(child(dbRef, `companyHolidays`)),
    ]);

    if (!attendanceSnap.exists() && !holidaySnap.exists()) {
      setAttendanceData([]);
      setLoading(false);
      return;
    }

    const attendanceObj = attendanceSnap.exists() ? attendanceSnap.val() : {};
    const holidaysObj = holidaySnap.exists() ? holidaySnap.val() : {};

    const allEntries = Object.entries(attendanceObj).flatMap(([date, records]) =>
      Object.values(records)
    );

    const nowIST = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );

    const currentMonth = nowIST.getMonth();
    const currentYear = nowIST.getFullYear();
    const targetMonth = monthIndex ?? currentMonth;
    const isCurrentMonth = targetMonth === currentMonth;
    const today = isCurrentMonth ? nowIST.getDate() : 0;

    const summary = getAttendanceSummary(
      allEntries,
      targetMonth,
      currentYear,
      isCurrentMonth ? today : 31,
      true,
      employee.email
    );

    const firstDay = new Date(currentYear, targetMonth, 1).getDay();
    const calendarData = [];

    for (let i = 0; i < firstDay; i++) {
      calendarData.push({ key: `empty-${i}`, day: null, status: "Empty" });
    }

    summary.detailedDays.forEach(({ day, status }) => {
      const dateStr = getISTDateString(currentYear, targetMonth, day);

      // If it's a company holiday
      if (holidaysObj[dateStr]) {
        calendarData.push({
          key: `day-${day}`,
          day,
          status: "CH",
          date: dateStr,
          holidayReason: holidaysObj[dateStr].reason,
          isToday: isCurrentMonth && day === today,
        });
      } else {
        const loginRecord = allEntries.find(
          (a) =>
            a.date === dateStr &&
            a.email.toLowerCase() === employee.email.toLowerCase()
        );

        calendarData.push({
          key: `day-${day}`,
          day,
          status,
          date: dateStr,
          loginTime: loginRecord?.login,
          isToday: isCurrentMonth && day === today,
        });
      }
    });

    setAttendanceData(calendarData);
    setLoading(false);
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const monthOptions = Array.from(
    { length: new Date().getMonth() + 1 },
    (_, i) => {
      const date = new Date(new Date().getFullYear(), i);
      return {
        value: i,
        label: date.toLocaleString("default", { month: "long" }),
      };
    }
  );

  const handleMonthChange = (e) => {
    const month = Number(e.target.value);
    setSelectedMonth(month);
    fetchAttendance(month);
  };

  if (loading || !emp)
    return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto p-3 sm:p-4 text-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2 sm:gap-0">
        <h1 className="text-lg sm:text-xl font-semibold">
          Your Attendance –{" "}
          {new Date(
            new Date().getFullYear(),
            selectedMonth ?? new Date().getMonth()
          ).toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </h1>

        <select
          onChange={handleMonthChange}
          value={selectedMonth ?? ""}
          className="border border-gray-300 px-2 py-1 rounded text-sm bg-white shadow-sm"
        >
          <option value="">Current Month</option>
          {monthOptions.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-6">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={`header-${day}`}
            className="text-center font-medium py-1 text-xs"
          >
            {day}
          </div>
        ))}

        {attendanceData.map(
          ({ key, day, status, date, loginTime, holidayReason, isToday }) => (
            <div
              key={key}
              className={`relative p-2 rounded text-center group text-xs sm:text-sm
              ${day ? statusColor[status] : "bg-transparent"} 
              ${isToday ? "ring-2 ring-blue-500" : ""}
              ${day ? "text-white font-medium" : "text-transparent"}
              h-10 sm:h-12 flex items-center justify-center`}
            >
              {day}
              {day && (
                <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded bottom-full mb-1 left-1/2 transform -translate-x-1/2 z-10 w-[140px] sm:w-[160px]">
                  <div className="font-bold border-b border-gray-600 pb-1">
                    {date}
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>Status:</span>
                    <span className="font-semibold">{status}</span>
                  </div>
                  {status === "CH" && (
                    <div className="mt-1">
                      <span className="block">
                        Reason: {holidayReason || "Holiday"}
                      </span>
                    </div>
                  )}
                  {loginTime && (
                    <div className="flex justify-between mt-1">
                      <span>Time:</span>
                      <span>
                        {new Date(loginTime).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                          timeZone: "Asia/Kolkata",
                        })}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 border-t pt-3 text-xs sm:text-sm">
        <h3 className="font-semibold mb-2">Legend:</h3>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Present</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span>Half Day</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-500" />
            <span>Leave</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-400" />
            <span>Week Off</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span>Company Holiday (CH)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
