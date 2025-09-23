"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { db } from "../../lib/firebase";
import {
  ref,
  onValue,
  get,
  child,
  update,
  remove,
  set,
} from "firebase/database";
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
  const [weekoffs, setWeekoffs] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);

  // ---- FETCH EMPLOYEES, HOLIDAYS, WEEKOFFS ----
  useEffect(() => {
    const empRef = ref(db, "employees");
    const unsubEmp = onValue(empRef, (snapshot) => {
      const data = snapshot.val();
      setEmployees(data ? Object.values(data) : []);
    });

    const holRef = ref(db, "companyHolidays");
    const unsubHol = onValue(holRef, (snapshot) => {
      const data = snapshot.val();
      setHolidays(data || {});
    });

    const weekRef = ref(db, "weekoffs");
    const unsubWeek = onValue(weekRef, (snapshot) => {
      const data = snapshot.val();
      setWeekoffs(data || {});
    });

    return () => {
      unsubEmp();
      unsubHol();
      unsubWeek();
    };
  }, []);

  // ---- FETCH ATTENDANCE FOR SELECTED DATE ----
  useEffect(() => {
    if (!selectedDate) return;
    const attRef = ref(db, `attendance/${selectedDate}`);
    const unsubAtt = onValue(attRef, (snapshot) => {
      const data = snapshot.val();
      const formatted = data
        ? Object.entries(data).map(([email, value]) => ({
            email,
            ...value,
          }))
        : [];
      setAttendanceData(formatted);
    });
    return () => unsubAtt();
  }, [selectedDate]);

  // ---- HELPERS ----
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

  // ---- LOGIC: HOLIDAY / WEEKOFF / ATTENDANCE ----
  const isHoliday = holidays[selectedDate] !== undefined;
  const holidayReason = isHoliday ? holidays[selectedDate].reason : "";

  const employeeMap = new Map(
    employees.map((emp) => [(emp.email || "").toLowerCase(), emp])
  );

  const presentEmployees = attendanceData.map((att) => {
    const email = (att.email || "").toLowerCase();
    const emp = employeeMap.get(email) || {};

    let status = "Present";

    if (isHoliday) {
      status = `Holiday (${holidayReason})`;
    } else if (att.status === "Leave") {
      status = "Leave";
    } else if (att.status === "Week Off") {
      status = "Week Off";
    } else if (att.status === "Absent") {
      status = "Absent";
    } else if (att.status === "Half Day") {
      status = "Half Day";
    } else if (att.login) {
      // derive from login time if not set
      const loginDate = new Date(att.login);
      const hour = loginDate.getHours();
      const minute = loginDate.getMinutes();
      if (hour > 11 || (hour === 11 && minute > 0)) {
        status = "Half Day";
      }
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

  const fallbackEmployees = employees
    .filter((emp) => {
      const email = (emp.email || "").toLowerCase();
      return !presentEmployees.some((pe) => pe.email.toLowerCase() === email);
    })
    .map((emp) => {
      let status;
      if (isHoliday) {
        status = `Holiday (${holidayReason})`;
      } else {
        const dateKey = selectedDate;
        const empId = emp.id;

        // Get week start (Sunday) and end (Saturday)
      const selected = new Date(selectedDate);
      const day = selected.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const weekStart = new Date(selected);
      weekStart.setDate(selected.getDate() - day);
      const weekEnd = new Date(selected);
      weekEnd.setDate(selected.getDate() + (6 - day));

      // Check if employee has any weekoff in this week
      const empWeekoffs = weekoffs[empId] || {};
      const hasWeekoffThisWeek = Object.keys(empWeekoffs).some((wkDate) => {
        const wk = new Date(wkDate);
        return wk >= weekStart && wk <= weekEnd;
      });

        // ✅ Weekoff priority: DB entry > fallback Tuesday
        if (empWeekoffs[dateKey]) {
        status = "Week Off"; // DB entry for this date
      } else if (!hasWeekoffThisWeek && selected.getDay() === 2) {
        // No weekoff this week → default Tuesday
        status = "Week Off";
      } else {
        status = "Absent";
      }
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

  // ---- EXPORT ----
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

  async function downloadMonthlyAttendance(employeesObj, monthIndex = null) {
    if (!employeesObj) {
      alert("No employees data available!");
      return;
    }

    const employees = Array.isArray(employeesObj)
      ? employeesObj
      : Object.values(employeesObj);

    if (employees.length === 0) {
      alert("No employees data available!");
      return;
    }

    // Get current IST date
    const nowIST = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );
    const currentMonth = nowIST.getMonth();
    const currentYear = nowIST.getFullYear();
    const targetMonth = monthIndex ?? currentMonth;

    const daysInMonth = new Date(currentYear, targetMonth + 1, 0).getDate();

    // Fetch all attendance & holidays
    const dbRef = ref(db);
    const [attendanceSnap, holidaySnap] = await Promise.all([
      get(child(dbRef, `attendance`)),
      get(child(dbRef, `companyHolidays`)),
    ]);

    const attendanceObj = attendanceSnap.exists() ? attendanceSnap.val() : {};
    const holidaysObj = holidaySnap.exists() ? holidaySnap.val() : {};

    // --- Build quick lookup map: email -> date -> record
  const attendanceMap = {};
  for (const dateKey in attendanceObj) {
    const records = attendanceObj[dateKey];
    for (const recKey in records) {
      const rec = records[recKey];
      const emailLower = (rec.email || "").toLowerCase();
      if (!attendanceMap[emailLower]) attendanceMap[emailLower] = {};
      attendanceMap[emailLower][dateKey] = rec;
    }
  }

    const reportData = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(targetMonth + 1).padStart(
        2,
        "0"
      )}-${String(day).padStart(2, "0")}`;

      employees.forEach((emp) => {
        const email = (emp.email || "").toLowerCase();

        // Find login record for this employee on this day
        let loginRecord = null;

        for (const dateKey in attendanceObj) {
          const records = Object.values(attendanceObj[dateKey]);
          const rec = records.find(
            (r) => (r.email || "").toLowerCase() === email
          );

          if (rec?.login) {
            // Convert login to IST
            const loginDateIST = new Date(
              new Date(rec.login).toLocaleString("en-US", {
                timeZone: "Asia/Kolkata",
              })
            );

            const recordYear = loginDateIST.getFullYear();
            const recordMonth = loginDateIST.getMonth();
            const recordDate = loginDateIST.getDate();

            if (
              recordYear === currentYear &&
              recordMonth === targetMonth &&
              recordDate === day
            ) {
              loginRecord = { ...rec, loginDateIST }; // keep IST version
              break;
            }
          }
        }

        let status = "Absent";
        let loginTime = "";
        let holidayReason = "";

        if (holidaysObj[dateStr]) {
          status = "CH";
          holidayReason = holidaysObj[dateStr].reason;
        } else if (loginRecord?.status) {
          status = loginRecord.status;
        } else if (loginRecord?.loginDateIST) {
          const totalMinutes =
            loginRecord.loginDateIST.getHours() * 60 +
            loginRecord.loginDateIST.getMinutes();

          if (totalMinutes >= 570 && totalMinutes <= 660)
            status = "Present"; // 9:30–11:00
          else if (totalMinutes > 660) status = "Half Day"; // after 11:00
          else status = "Leave"; // before 9:30

          loginTime = loginRecord.loginDateIST.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
        }

        // ---------------- Sandwich Leave Logic ----------------
      if (status === "Week Off") {
        const prevDateStr = day > 1
          ? getISTDateString(currentYear, targetMonth, day - 1)
          : null;
        const nextDateStr = day < totalDays
          ? getISTDateString(currentYear, targetMonth, day + 1)
          : null;

        const prevAbsent =
          prevDateStr &&
          ((attendanceMap[email]?.[prevDateStr]?.status === "Absent") ||
            (!attendanceMap[email]?.[prevDateStr] && !holidaysObj[prevDateStr]));

        const nextAbsent =
          nextDateStr &&
          ((attendanceMap[email]?.[nextDateStr]?.status === "Absent") ||
            (!attendanceMap[email]?.[nextDateStr] && !holidaysObj[nextDateStr]));

        if (prevAbsent && nextAbsent) {
          status = "Absent";
        }
      }


        reportData.push({
          Date: dateStr,
          Name: emp.name,
          Email: emp.email,
          ID: emp.id,
          Designation: emp.designation || "N/A",
          Status: status,
          LoginTime: loginTime || "N/A",
          HolidayReason: holidayReason || "",
        });
      });
    }

    // Export to Excel
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Monthly Attendance");
    XLSX.writeFile(workbook, `Attendance_Month_${targetMonth + 1}.xlsx`);
  }

  // ---- RENDER ----
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
        <div
          className="relative w-full md:w-auto"
          onMouseEnter={() => {
            clearTimeout(window.hideDropdownTimeout);
            setShowDropdown(true);
          }}
          onMouseLeave={() => {
            window.hideDropdownTimeout = setTimeout(() => {
              setShowDropdown(false);
            }, 2000); // stays 2 seconds after mouse leaves
          }}
        >
          <button className="w-full md:w-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium">
            Download Summary
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-1 bg-white border rounded shadow z-10 w-full md:w-52 p-2">
              {/* By Date */}
              <button
                onClick={downloadDayAttendance}
                className="block w-full px-4 py-2 hover:bg-gray-100 text-left text-sm rounded"
              >
                By Date
              </button>

              {/* By Month */}
              <div className="mt-1 flex flex-col gap-1">
                <button
                  onClick={() =>
                    downloadMonthlyAttendance(employees, selectedMonth)
                  }
                  className="block w-full px-4 py-2 hover:bg-gray-100 text-left text-sm rounded"
                >
                  By Month
                </button>

                {/* Month Selector */}
                <select
                  className="border rounded px-2 py-1 text-sm mt-1"
                  value={selectedMonth ?? new Date().getMonth()}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>
                      {new Date(0, i).toLocaleString("en-US", {
                        month: "long",
                      })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
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
              id={selectedEmployee.id}
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
  const [loginTime, setLoginTime] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStatus(currentStatus || "");

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
      const dateKey = selectedDate;
      const empKey = employeeData.email.replace(/\./g, "_");
      const empRef = ref(db, `attendance/${dateKey}/${empKey}`);

      // ✅ CASE 1: Absent → remove entry
      if (status === "Absent") {
        await remove(empRef);
        toast.success("Attendance removed (Absent) ✅");
        onClose();
        return;
      }

      // ✅ CASE 2: Present / Half Day
      if (["Present", "Half Day"].includes(status)) {
        let loginDate = null;
        if (loginTime) {
          loginDate = new Date(`${selectedDate}T${loginTime}:00+05:30`); // IST
        }

        const record = {
          name: employeeData.name,
          email: employeeData.email,
          number: employeeData.number || "",
          date: dateKey,
          device: employeeData.device || "",
          location: employeeData.location || "",
          login: loginDate ? loginDate.toISOString() : null, // UTC ISO
          istLoginTime: loginDate
            ? new Date(
                loginDate.getTime() - loginDate.getTimezoneOffset() * 60000
              ).toISOString() // ✅ ISO in IST
            : null,
          status,
        };

        await set(empRef, record);
        toast.success("Attendance updated ✅");
        onClose();
        return;
      }

      // ✅ CASE 3: Leave / Week Off (store without login)
      if (["Leave", "Week Off"].includes(status)) {
        const record = {
          name: employeeData.name,
          email: employeeData.email,
          number: employeeData.number || "",
          device: employeeData.device || "",
          location: employeeData.location || "",
          date: dateKey,
          login: null,
          istLoginTime: null,
          status,
        };

        await set(empRef, record);
        toast.success("Attendance updated ✅");
        onClose();
        return;
      }
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
          {/* <option value="Week Off">Week Off</option> */}
        </select>

        {/* Time input only for Present/Half Day */}
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

function EmployeeCalendarAdmin({id, email, name }) {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);
  const [holidayReason, setHolidayReason] = useState("");
  const [weekoffs, setWeekoffs] = useState({}); // ✅ Dynamic weekoffs

  const statusColor = {
    Present: "bg-green-500",
    Absent: "bg-red-600",
    Leave: "bg-orange-500",
    "Half Day": "bg-yellow-500",
    "Week Off": "bg-gray-400",
    CH: "bg-blue-500",
    Empty: "bg-transparent",
  };

  // ✅ Fetch weekoffs from Firebase
  // ✅ Fetch weekoffs for this employee only
useEffect(() => {
  if (!email) return;

  const empRef = ref(db, "employees");
  get(empRef).then(snapshot => {
    if (!snapshot.exists()) return;
    const allEmployees = Object.values(snapshot.val());
    const emp = allEmployees.find(e => 
      (e.email || "").toLowerCase() === email.toLowerCase()
    );
    if (!emp) return;

    const weekRef = ref(db, `weekoffs/${emp.id}`);
    const unsubWeek = onValue(weekRef, (snapshot) => {
      setWeekoffs(snapshot.val() || {});
    });
    return () => unsubWeek();
  });
}, [email]);

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
      const daysInMonth = new Date(currentYear, targetMonth + 1, 0).getDate()

      const loginRecord = Object.entries(attendanceObj[dateStr] || {})
        .map(([k, v]) => v)
        .find(
          (rec) =>
            (rec.email || "").toLowerCase() === (email || "").toLowerCase()
        );

      let finalStatus = status;
      let holidayReason = null;

      if (holidaysObj[dateStr]) {
        // ✅ Company holiday overrides everything
        finalStatus = "CH";
        holidayReason = holidaysObj[dateStr].reason;
      } else if (loginRecord?.status) {
        // ✅ Respect stored status in DB
        finalStatus = loginRecord.status;
      } else if (loginRecord?.login) {
        // ✅ If login time exists → calculate Present / Half Day
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
      } else if (weekoffs?.[dateStr]) {
        // ✅ Weekoff from DB for this employee
        finalStatus = "Week Off";
      } else {
  // ✅ Replace naive Tuesday fallback with this smarter logic
  const dateObj = new Date(dateStr);
  const dayOfWeek = dateObj.getDay();

  const weekStart = new Date(dateObj);
  weekStart.setDate(dateObj.getDate() - dayOfWeek);
  const weekEnd = new Date(dateObj);
  weekEnd.setDate(dateObj.getDate() + (6 - dayOfWeek));

  const empWeekoffs = weekoffs || {};
  const hasWeekoffThisWeek = Object.keys(empWeekoffs).some((wkDate) => {
    const wk = new Date(wkDate);
    return wk >= weekStart && wk <= weekEnd;
  });

  if (!hasWeekoffThisWeek && dayOfWeek === 2) {
    finalStatus = "Week Off";
  } else {
    finalStatus = "Absent";
  }
}

     if (finalStatus === "Week Off") {
  const prevDateStr = day > 1
    ? getISTDateString(currentYear, targetMonth, day - 1)
    : null;

  const nextDateStr = day < daysInMonth
    ? getISTDateString(currentYear, targetMonth, day + 1)
    : null;

  const prevHasRecord =
    prevDateStr &&
    Object.values(attendanceObj[prevDateStr] || {}).some(
      (rec) => (rec.email || "").toLowerCase() === email.toLowerCase()
    );

  const nextHasRecord =
    nextDateStr &&
    Object.values(attendanceObj[nextDateStr] || {}).some(
      (rec) => (rec.email || "").toLowerCase() === email.toLowerCase()
    );

  if (!prevHasRecord && !nextHasRecord) {
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
  }, [email, weekoffs]);

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
              onClick={() =>
                handleDayClick(date, status, loginRecord, holidayReason)
              }
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
