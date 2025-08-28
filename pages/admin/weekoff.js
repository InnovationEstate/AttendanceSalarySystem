"use client";

import { useState, useEffect } from "react";
import { getDatabase, ref, get, set, remove } from "firebase/database";
import { app } from "@/lib/firebase";

// --- UTILITIES ---
function toDateKey(d) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0]; // YYYY-MM-DD
}

// Find Monday of given week (to enforce 1 weekoff per week)
function getWeekStartDate(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun ... 6=Sat
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust to Monday
  return new Date(d.setDate(diff));
}

export default function WeekOffPage() {
  const db = getDatabase(app);

  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState("");
  const [weekoffs, setWeekoffs] = useState({}); // { dateKey: true }
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      const snapshot = await get(ref(db, "employees"));
      if (snapshot.exists()) {
        setEmployees(Object.values(snapshot.val()));
      }
    };
    fetchEmployees();
  }, []);

  // Fetch weekoffs for selected employee
  useEffect(() => {
    if (!selectedEmp) return;
    const fetchWeekoffs = async () => {
      const snapshot = await get(ref(db, `weekoffs/${selectedEmp}`));
      if (snapshot.exists()) {
        setWeekoffs(snapshot.val());
      } else {
        setWeekoffs({});
      }
    };
    fetchWeekoffs();
  }, [selectedEmp]);

  // Handle selecting/deselecting date
  const handleDateClick = async (date) => {
    if (!selectedEmp) {
      alert("Select employee first!");
      return;
    }

    const dateKey = toDateKey(date);
    const weekStart = toDateKey(getWeekStartDate(date));

    // Check if same week's weekoff already exists
    const existingWeekOff = Object.keys(weekoffs).find((d) => {
      const ws = toDateKey(getWeekStartDate(new Date(d)));
      return ws === weekStart;
    });

    if (weekoffs[dateKey]) {
      // Deselect weekoff
      await remove(ref(db, `weekoffs/${selectedEmp}/${dateKey}`));
      const updated = { ...weekoffs };
      delete updated[dateKey];
      setWeekoffs(updated);
    } else {
      if (existingWeekOff) {
        alert("Weekoff already set for this week. Remove it first.");
        return;
      }
      await set(ref(db, `weekoffs/${selectedEmp}/${dateKey}`), true);
      setWeekoffs({ ...weekoffs, [dateKey]: true });
    }
  };

  // Generate calendar days
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const weeks = [];
    let dayCounter = 1 - firstDay;

    for (let week = 0; week < 6; week++) {
      const days = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(year, month, dayCounter);
        const dateKey = toDateKey(date);
        const isCurrentMonth = date.getMonth() === month;

        days.push(
          <td
            key={i}
            onClick={() => isCurrentMonth && handleDateClick(date)}
            className={`p-2 text-center cursor-pointer rounded-lg ${
              isCurrentMonth
                ? weekoffs[dateKey]
                  ? "bg-red-500 text-white"
                  : "hover:bg-gray-200"
                : "text-gray-400"
            }`}
          >
            {isCurrentMonth ? date.getDate() : ""}
          </td>
        );

        dayCounter++;
      }
      weeks.push(<tr key={week}>{days}</tr>);
    }

    return weeks;
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Set Employee Weekoffs</h1>

      {/* Employee Selector */}
      <select
        className="border p-2 mb-4"
        value={selectedEmp}
        onChange={(e) => setSelectedEmp(e.target.value)}
      >
        <option value="">Select Employee</option>
        {employees.map((emp) => (
          <option key={emp.id} value={emp.id}>
            {emp.id} - {emp.email}
          </option>
        ))}
      </select>

      {/* Calendar Navigation */}
      <div className="flex justify-between items-center mb-2">
        <button
          className="px-3 py-1 border rounded"
          onClick={() =>
            setCurrentMonth(
              new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
            )
          }
        >
          Prev
        </button>
        <h2 className="font-semibold">
          {currentMonth.toLocaleString("default", {
            month: "long",
          })}{" "}
          {currentMonth.getFullYear()}
        </h2>
        <button
          className="px-3 py-1 border rounded"
          onClick={() =>
            setCurrentMonth(
              new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
            )
          }
        >
          Next
        </button>
      </div>

      {/* Calendar Table */}
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <th key={d} className="border p-2">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{renderCalendar()}</tbody>
      </table>

      <p className="mt-4 text-sm text-gray-600">
        🔴 Red = Weekoff (Click to remove) | ⚪ White = Available
      </p>
    </div>
  );
}
