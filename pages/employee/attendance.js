
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
  const empLocal = JSON.parse(localStorage.getItem("employee"));
  if (!empLocal?.email) return;

  setLoading(true);

  const dbRef = ref(db);

  // 🔹 Step 1: Get full employee record (with id)
  const employeesSnap = await get(child(dbRef, "employees"));
  if (!employeesSnap.exists()) {
    setLoading(false);
    return;
  }

  const employeesArray = Object.values(employeesSnap.val());
  const fullEmployee = employeesArray.find(
    (e) => e.email.toLowerCase() === empLocal.email.toLowerCase()
  );

  if (!fullEmployee) {
    setLoading(false);
    return;
  }

  setEmp(fullEmployee);

  // 🔹 Step 2: Fetch attendance, holidays, weekoffs, leaveRequests
  const [attendanceSnap, holidaySnap, weekoffSnap, leaveSnap] =
    await Promise.all([
      get(child(dbRef, `attendance`)),
      get(child(dbRef, `companyHolidays`)),
      get(child(dbRef, `weekoffs/${fullEmployee.id}`)), // use employee.id
      get(child(dbRef, `leaveRequests/${fullEmployee.id}`)), // use employee.id
    ]);

  const attendanceObj = attendanceSnap.exists() ? attendanceSnap.val() : {};
  const holidaysObj = holidaySnap.exists() ? holidaySnap.val() : {};
  const weekoffsObj = weekoffSnap.exists() ? weekoffSnap.val() : {};
  const leaveObj = leaveSnap.exists() ? leaveSnap.val() : {};

  // Flatten attendance
  const allEntries = Object.entries(attendanceObj).flatMap(([_, records]) =>
    Object.values(records)
  );

  // Current IST date
  const nowIST = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );

  const currentMonth = nowIST.getMonth();
  const currentYear = nowIST.getFullYear();
  const targetMonth = monthIndex ?? currentMonth;
  const isCurrentMonth = targetMonth === currentMonth;
  const today = isCurrentMonth ? nowIST.getDate() : 0;

  // Get summary
  const summary = getAttendanceSummary(
    allEntries,
    targetMonth,
    currentYear,
    isCurrentMonth ? today : 31,
    true,
    fullEmployee.email // use email for matching attendance
  );

  const firstDay = new Date(currentYear, targetMonth, 1).getDay();
  const calendarData = [];

  // Fill empty slots before first day
  for (let i = 0; i < firstDay; i++) {
    calendarData.push({ key: `empty-${i}`, day: null, status: "Empty" });
  }

  summary.detailedDays.forEach(({ day }) => {
    const dateStr = getISTDateString(currentYear, targetMonth, day);
    const dateObj = new Date(currentYear, targetMonth, day);
    const weekday = dateObj.getDay();

   let finalStatus = "Absent"; // default

// 1. Company Holiday
if (holidaysObj[dateStr]) {
  finalStatus = "CH";
}
// 2. Weekoff (use weekoffsObj directly)
else if (weekoffsObj[dateStr]) {
  // ✅ Check if employee has a login record on this weekoff
  const loginRecord = allEntries.find(
    (a) =>
      a.date === dateStr &&
      a.email.toLowerCase() === fullEmployee.email.toLowerCase()
  );

  if (loginRecord) {
    if (loginRecord.login) {
      // Convert login time to IST
      const loginTimeIST = new Date(
        new Date(loginRecord.login).toLocaleString("en-US", {
          timeZone: "Asia/Kolkata",
        })
      );
      const loginHour = loginTimeIST.getHours();
      const loginMinute = loginTimeIST.getMinutes();

      // ✅ If login on/before 11:00 AM → Present, else Half Day
      if (loginHour < 11 || (loginHour === 11 && loginMinute === 0)) {
        finalStatus = "Present";
      } else {
        finalStatus = "Half Day";
      }
    } else {
      // ✅ Fallback: login exists but no time
      finalStatus = "Present";
    }
  } else {
    // 🔄 No login on weekoff → check sandwich leave
  // Check Sandwich Leave: previous and next days absent
  const prevDateStr = day > 1 ? getISTDateString(currentYear, targetMonth, day - 1) : null;
  const nextDateStr = day < dateObj ? getISTDateString(currentYear, targetMonth, day + 1) : null;

  const prevIsAbsent =
    prevDateStr &&
    !holidaysObj[prevDateStr] &&
    !weekoffsObj[prevDateStr] &&
    !leaveObj[prevDateStr] &&
    !allEntries.find(
      (a) =>
        a.date === prevDateStr &&
        a.email.toLowerCase() === fullEmployee.email.toLowerCase()
    );

  const nextIsAbsent =
    nextDateStr &&
    !holidaysObj[nextDateStr] &&
    !weekoffsObj[nextDateStr] &&
    !leaveObj[nextDateStr] &&
    !allEntries.find(
      (a) =>
        a.date === nextDateStr &&
        a.email.toLowerCase() === fullEmployee.email.toLowerCase()
    );

  if (prevIsAbsent && nextIsAbsent) {
    finalStatus = "Absent";
  } else {
    finalStatus = "Week Off";
  }
}
}
// 3. Approved Leave
else if (leaveObj[dateStr] && leaveObj[dateStr].status === "approved") {
  finalStatus = "Leave";
}
// 4. Attendance Record (login time based logic)
else {
  const loginRecord = allEntries.find(
    (a) =>
      a.date === dateStr &&
      a.email.toLowerCase() === fullEmployee.email.toLowerCase()
  );

  if (loginRecord) {
    if (loginRecord.login) {
      const loginTimeIST = new Date(
        new Date(loginRecord.login).toLocaleString("en-US", {
          timeZone: "Asia/Kolkata",
        })
      );
      const loginHour = loginTimeIST.getHours();
      const loginMinute = loginTimeIST.getMinutes();

      if (loginHour < 11 || (loginHour === 11 && loginMinute === 0)) {
        finalStatus = "Present";
      } else {
        finalStatus = "Half Day";
      }
    } else {
      finalStatus = "Present"; // fallback if login exists but no time
    }
  }
}

// 5. Default weekly off fallback (apply only if still Absent)
if (finalStatus === "Absent" && weekday === 2) {
  const prevDateStr = day > 1 ? getISTDateString(currentYear, targetMonth, day - 1) : null;
  const nextDateStr = day < dateObj ? getISTDateString(currentYear, targetMonth, day + 1) : null;

  const prevIsAbsent =
    prevDateStr &&
    !holidaysObj[prevDateStr] &&
    !weekoffsObj[prevDateStr] &&
    !leaveObj[prevDateStr] &&
    !allEntries.find(
      (a) =>
        a.date === prevDateStr &&
        a.email.toLowerCase() === fullEmployee.email.toLowerCase()
    );

  const nextIsAbsent =
    nextDateStr &&
    !holidaysObj[nextDateStr] &&
    !weekoffsObj[nextDateStr] &&
    !leaveObj[nextDateStr] &&
    !allEntries.find(
      (a) =>
        a.date === nextDateStr &&
        a.email.toLowerCase() === fullEmployee.email.toLowerCase()
    );

  if (prevIsAbsent && nextIsAbsent) {
    finalStatus = "Absent";
  } else {
    finalStatus = "Week Off";
  }
}

    // Push to calendar data
    calendarData.push({
      key: `day-${day}`,
      day,
      status: finalStatus,
      date: dateStr,
      loginTime: allEntries.find(
        (a) =>
          a.date === dateStr &&
          a.email.toLowerCase() === fullEmployee.email.toLowerCase()
      )?.login,
      holidayReason: holidaysObj[dateStr]?.reason,
      isToday: isCurrentMonth && day === today,
    });
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
            <div className="w-3 h-3 rounded bg-red-600" />
            <span>Absent</span>
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

