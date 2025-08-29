"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { db } from "../../lib/firebase";
import { ref, onValue, get, child, update } from "firebase/database";
import getAttendanceSummary, {
  getISTDateString,
} from "../../utils/attendanceUtils";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AdminAttendance() {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [attendanceData, setAttendanceData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [holidays, setHolidays] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    // Employees
    const empRef = ref(db, "employees");
    const unsubEmp = onValue(empRef, (snapshot) => {
      const data = snapshot.val();
      setEmployees(data ? Object.values(data) : []);
    });

    // Holidays
    const holRef = ref(db, "companyHolidays");
    const unsubHol = onValue(holRef, (snapshot) => {
      const data = snapshot.val();
      setHolidays(data || {});
    });

    return () => {
      unsubEmp();
      unsubHol();
    };
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    // Attendance for selected date (table view)
    const attRef = ref(db, `attendance/${selectedDate}`);
    const unsubAtt = onValue(attRef, (snapshot) => {
      const data = snapshot.val();
      const formatted = data
        ? Object.entries(data).map(([email, value]) => ({ email, ...value }))
        : [];
      setAttendanceData(formatted);
    });

    return () => unsubAtt();
  }, [selectedDate]);

  function getTodayDate() {
    const now = new Date();
    return now.toISOString().split("T")[0];
  }

  function getDayName(dateStr) {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN", { weekday: "long" });
    } catch {
      return "";
    }
  }

  function toIst12HourFormat(utcTimeStr) {
    if (!utcTimeStr) return "";
    try {
      const date = new Date(utcTimeStr);
      const hours = date.getHours() % 12 || 12;
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const ampm = date.getHours() >= 12 ? "PM" : "AM";
      return `${hours}:${minutes} ${ampm}`;
    } catch {
      return "";
    }
  }

  function formatLocationLink(address, lat, lon) {
    if (!address) return "N/A";
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;
    return (
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline"
        title={address}
      >
        {address.length > 30 ? address.slice(0, 30) + "..." : address}
      </a>
    );
  }

  const isHoliday = holidays[selectedDate] !== undefined;
  const holidayReason = isHoliday ? holidays[selectedDate].reason : "";

  const employeeMap = new Map(
    employees.map((emp) => [(emp.email || "").toLowerCase(), emp])
  );

  const presentEmployees = attendanceData
  .filter((att) => att.login)
  .map((att) => {
    const email = (att.email || "").toLowerCase();
    const emp = employeeMap.get(email) || {};

    // Parse login time
    const loginDate = new Date(att.login);
    const hour = loginDate.getHours();
    const minute = loginDate.getMinutes();

    let status = "Present";

    if (isHoliday) {
      status = `Holiday (${holidayReason})`;
    } else if (att.leave) {
      // mark directly as leave if leave applied
      status = "Leave";
    } else if (hour > 11 || (hour === 11 && minute > 0)) {
      status = "Half Day";
    }

    return {
      id: emp.id || "N/A",
      name: emp.name || att.name || "N/A",
      email: att.email || "N/A",
      designation: emp.designation || "N/A",
      loginTime: toIst12HourFormat(att.login),
      location: {
        address: att.location?.address || "",
        lat: att.location?.latitude || "",
        lon: att.location?.longitude || "",
      },
      status,
    };
  });

// Employees who didn't login that day
const fallbackEmployees = employees
  .filter((emp) => {
    const email = (emp.email || "").toLowerCase();
    return !presentEmployees.some((pe) => pe.email.toLowerCase() === email);
  })
  .map((emp) => {
    let status;
    if (isHoliday) {
      status = `Holiday (${holidayReason})`;
    } else if (emp.leave) {
      status = "Leave";
    } else {
      const dow = new Date(selectedDate).getDay();
      status = dow === 2 ? "Week Off" : "Absent"; // Tuesday = Week Off
    }
    return {
      id: emp.id || "N/A",
      name: emp.name || "N/A",
      email: emp.email || "N/A",
      designation: emp.designation || "N/A",
      loginTime: "",
      location: null,
      status,
    };
  });


  function exportExcel(data, fileName) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  }

  function downloadDayAttendance() {
    const data = [...presentEmployees, ...fallbackEmployees].map((emp) => ({
      ID: emp.id,
      Name: emp.name,
      Email: emp.email,
      Designation: emp.designation,
      LoginTime: emp.loginTime || "N/A",
      Location: emp.location?.address || "N/A",
      Status: emp.status,
    }));
    exportExcel(data, `Attendance_${selectedDate}`);
  }

  function downloadMonthlyAttendance() {
    alert("Monthly export not supported in this real-time view.");
  }

  return (
    <main className="p-4 sm:p-6 bg-gray-100 min-h-screen text-xs sm:text-sm md:text-base">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
            Attendance - {selectedDate} ({getDayName(selectedDate)})
          </h1>
          {isHoliday ? (
            <p className="mt-1 font-medium text-red-700">
              Holiday: {holidayReason}
            </p>
          ) : (
            <p className="mt-1 font-medium text-green-700">
              Total Present: {presentEmployees.length}
            </p>
          )}
        </div>

        {/* Download Dropdown */}
        <div className="relative w-full md:w-auto group">
          <button className="w-full md:w-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium">
            Download Summary
          </button>
          <div className="absolute right-0 mt-1 hidden group-hover:block bg-white border rounded shadow z-10 w-full md:w-48">
            <button
              onClick={downloadDayAttendance}
              className="block w-full px-4 py-2 hover:bg-gray-100 text-left text-sm"
            >
              By Date
            </button>
            <button
              onClick={downloadMonthlyAttendance}
              className="block w-full px-4 py-2 hover:bg-gray-100 text-left text-sm"
            >
              By Month
            </button>
          </div>
        </div>
      </div>

      {/* Date Selector */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <label htmlFor="date" className="font-medium text-gray-700">
          Select Date:
        </label>
        <input
          type="date"
          id="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border rounded px-3 py-2 text-xs sm:text-sm max-w-xs w-full shadow-sm"
          max={getTodayDate()}
        />
      </div>

      {/* Attendance Table */}
      <div className="overflow-x-auto rounded shadow-sm border bg-white">
        <table className="min-w-full text-xs sm:text-sm table-auto">
          <thead className="bg-blue-100 text-gray-800">
            <tr>
              <th className="px-3 py-2 text-left whitespace-nowrap">ID</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Name</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Email</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">
                Designation
              </th>
              <th className="px-3 py-2 text-left whitespace-nowrap">
                Login Time
              </th>
              <th className="px-3 py-2 text-left whitespace-nowrap">
                Location
              </th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody>
            {[...presentEmployees, ...fallbackEmployees].map((emp) => (
              <tr
                key={emp.email}
                className="border-t hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setSelectedEmployee(emp);
                  setShowModal(true);
                }}
              >
                <td className="px-3 py-2 whitespace-nowrap">{emp.id}</td>
                <td className="px-3 py-2 whitespace-nowrap">{emp.name}</td>
                <td className="px-3 py-2 whitespace-nowrap">{emp.email}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {emp.designation}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{emp.loginTime}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {emp.location
                    ? formatLocationLink(
                        emp.location.address,
                        emp.location.lat,
                        emp.location.lon
                      )
                    : "N/A"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap font-semibold">
                  {emp.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Employee Calendar Modal */}
      {showModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/60 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full p-4 sm:p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              aria-label="Close"
              title="Close"
            >
              ✕
            </button>
            <EmployeeCalendarAdmin
              email={selectedEmployee.email}
              name={selectedEmployee.name}
            />
          </div>
        </div>
      )}
    </main>
  );
}

/* ------------ Modal Calendar (Admin view, same logic as employee panel) ------------ */

function AttendanceModal({
  isOpen,
  onClose,
  employeeData,
  selectedDate,
  currentStatus,
}) {
  const [status, setStatus] = useState(currentStatus || "");
  const [loginTime, setLoginTime] = useState(""); // HH:MM input
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStatus(currentStatus || "");

    // Pre-fill login time if record exists
    if (employeeData?.login) {
      const d = new Date(employeeData.login);
      const istTime = new Date(
        d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
      );
      const hh = istTime.getHours().toString().padStart(2, "0");
      const mm = istTime.getMinutes().toString().padStart(2, "0");
      setLoginTime(`${hh}:${mm}`);
    } else {
      setLoginTime("");
    }
  }, [currentStatus, employeeData]);

  if (!isOpen || !employeeData) return null;

 const handleSave = async () => {
  if (!employeeData) return;

  setLoading(true);
  try {
    const updates = {};
    const dateKey = selectedDate;
    const empKey = employeeData.email.replace(/\./g, "_");

    let finalStatus = status; // manual selection from frontend
    let loginDate = null;

    if (loginTime) {
      // Build IST datetime from selectedDate + loginTime
      const [hours, minutes] = loginTime.split(":").map(Number);
      loginDate = new Date(`${selectedDate}T${loginTime}:00+05:30`); // IST

      // Auto-determine status only if not manually set to Week Off, Leave, or Half Day
      if (!["Week Off", "Leave", "Half Day"].includes(finalStatus)) {
        if (hours < 9 || (hours === 9 && minutes < 30)) {
          finalStatus = "Present";
        } else if (hours < 11 || (hours === 11 && minutes === 0)) {
          finalStatus = "Present";
        } else {
          finalStatus = "Half Day";
        }
      }
    } else {
      // No login time → fallback
      if (!["Leave", "Week Off"].includes(finalStatus)) {
        finalStatus = "Absent";
      }
    }

    // Save login times **only** for Present or Half Day
    const shouldKeepLogin = finalStatus === "Present" || finalStatus === "Half Day";

    updates[`attendance/${dateKey}/${empKey}`] = {
      name: employeeData.name,
      email: employeeData.email,
      number: employeeData.number || "",
      device: employeeData.device || "",
      location: employeeData.location || "",
      login: shouldKeepLogin ? loginDate?.toISOString() || null : null,
      istLoginTime: shouldKeepLogin
        ? loginDate?.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
            timeZone: "Asia/Kolkata",
          }) || null
        : null,
      status: finalStatus,
    };

    await update(ref(db), updates);
    toast.success("Attendance updated ✅");
    onClose();
  } catch (error) {
    console.error("Error updating attendance:", error);
    toast.error("Failed to update attendance ❌");
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-semibold mb-4">Edit Attendance</h2>
        <p className="mb-2">
          Date: <b>{selectedDate}</b>
        </p>

        <select
          className="w-full border p-2 rounded mb-4"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Select Status</option>
          <option value="Present">Present</option>
          <option value="Half Day">Half Day</option>
          <option value="Absent">Absent</option>
          <option value="Leave">Leave</option>
          <option value="Week Off">Week Off</option>
        </select>

        {/* Only show time input for Present/Half Day */}
        {["Present", "Half Day"].includes(status) && (
          <input
            type="time"
            className="w-full border p-2 rounded mb-4"
            value={loginTime}
            onChange={(e) => setLoginTime(e.target.value)}
          />
        )}

        <div className="flex justify-end space-x-2">
          <button
            className="bg-gray-400 text-white px-4 py-2 rounded"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>

        
      </div>

      
    </div>
  );
}


function EmployeeCalendarAdmin({ email, name }) {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);

  const statusColor = {
    Present: "bg-green-500",
    Absent: "bg-red-600",
    Leave: "bg-orange-500",
    "Half Day": "bg-yellow-500",
    "Week Off": "bg-gray-400",
    CH: "bg-blue-500",
    Empty: "bg-transparent",
  };

  const fetchAttendance = async (monthIndex = null) => {
    if (!email) return;
    setLoading(true);

    const dbRef = ref(db);
    const [attendanceSnap, holidaySnap] = await Promise.all([
      get(child(dbRef, `attendance`)),
      get(child(dbRef, `companyHolidays`)),
    ]);

    const attendanceObj = attendanceSnap.exists() ? attendanceSnap.val() : {};
    const holidaysObj = holidaySnap.exists() ? holidaySnap.val() : {};

    const allEntries = Object.entries(attendanceObj).flatMap(
      ([date, records]) => Object.values(records)
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
      email
    );

    const firstDay = new Date(currentYear, targetMonth, 1).getDay();
    const calendarData = [];

    for (let i = 0; i < firstDay; i++) {
      calendarData.push({ key: `empty-${i}`, day: null, status: "Empty" });
    }

    summary.detailedDays.forEach(({ day, status }) => {
  const dateStr = getISTDateString(currentYear, targetMonth, day);

  const loginRecord = Object.entries(attendanceObj[dateStr] || {})
    .map(([k, v]) => v)
    .find(
      (rec) =>
        (rec.email || "").toLowerCase() === (email || "").toLowerCase()
    );

  let finalStatus = status;
  let holidayReason = null;
  if (holidaysObj[dateStr]) {
    finalStatus = "CH";
    holidayReason = holidaysObj[dateStr].reason;
  } 
  else if (new Date(dateStr).getDay() === 2) {
    // 0 = Sunday, 1 = Monday, 2 = Tuesday ...
    finalStatus = "Week Off";
  } else {
    if (loginRecord?.login) {
      const loginDate = new Date(loginRecord.login);
      const hours = loginDate.getHours();
      const minutes = loginDate.getMinutes();
      const totalMinutes = hours * 60 + minutes;

      if (totalMinutes >= 570 && totalMinutes <= 660) {
        finalStatus = "Present"; // 9:30–11:00
      } else if (totalMinutes > 660) {
        finalStatus = "Half Day"; // after 11:00
      } else {
        finalStatus = "Leave"; // before 9:30 treated as leave
      }
    } else {
      finalStatus = "Absent";
    }
  }

  calendarData.push({
    key: `day-${day}`,
    day,
    status: finalStatus,
    holidayReason,
    date: dateStr,
    loginRecord,
    isToday: isCurrentMonth && day === today,
  });
});


    setAttendanceData(calendarData);
    setLoading(false);
  };

  useEffect(() => {
    fetchAttendance();
  }, [email]);

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

  const handleDayClick = (date, status, record, holidayReason) => {
    if (!date) return;
    setSelectedDate(date);
    setSelectedStatus(status);
    setEmployeeData(record || { email, name, number: "" });
    setHolidayReason(holidayReason);
    setModalOpen(true);
  };

  if (loading)
    return (
      <div className="max-w-3xl mx-auto p-3 sm:p-4 text-sm">
        <div className="text-center py-6">Loading attendance…</div>
      </div>
    );

  return (
  <div className="max-w-3xl mx-auto p-3 sm:p-4 text-sm">
    {/* Header */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2 sm:gap-0">
      <h1 className="text-lg sm:text-xl font-semibold">
        {name || email} –{" "}
        {new Date(
          new Date().getFullYear(),
          selectedMonth ?? new Date().getMonth()
        ).toLocaleString("default", { month: "long", year: "numeric" })}
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

    {/* Calendar */}
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
        ({ key, day, status, date, loginRecord, holidayReason, isToday }) => (
          <div
            key={key}
            onClick={() => handleDayClick(date, status, loginRecord)}
            className={`cursor-pointer relative p-2 rounded text-center group text-xs sm:text-sm
              ${day ? statusColor[status] : "bg-transparent"} 
              ${isToday ? "ring-2 ring-blue-500" : ""} 
              ${day ? "text-white font-medium" : "text-transparent"}
              h-10 sm:h-12 flex items-center justify-center`}
          >
            {day}
            {day && (
              <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded bottom-full mb-1 left-1/2 transform -translate-x-1/2 z-10 w-[160px]">
                <div className="font-bold border-b border-gray-600 pb-1">
                  {date}
                </div>
                <div className="flex justify-between mt-1">
                  <span>Status:</span>
                  <span className="font-semibold">{status}</span>
                </div>
                {/* Show holiday reason only if status is CH */}
                {status === "CH" && holidayReason && (
                  <div className="flex justify-between mt-1">
                    <span>Holiday:</span>
                    <span className="font-semibold">{holidayReason}</span>
                  </div>
                )}
                {loginRecord?.login && (
                  <div className="flex justify-between mt-1">
                    <span>Time:</span>
                    <span>
                      {new Date(loginRecord.login).toLocaleTimeString(
                        "en-IN",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                          timeZone: "Asia/Kolkata",
                        }
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      )}
    </div>

    {/* ✅ Legend (below calendar) */}
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
          <div className="w-3 h-3 rounded bg-red-600" />
          <span>Absent</span>
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

    {/* Modal */}
    <AttendanceModal
      isOpen={modalOpen}
      onClose={() => setModalOpen(false)}
      employeeData={employeeData}
      selectedDate={selectedDate}
      currentStatus={selectedStatus}
      onSave={() => fetchAttendance(selectedMonth)}
    />
  </div>
);

}
