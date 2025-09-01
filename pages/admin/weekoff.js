"use client";

import { useState, useEffect } from "react";
import { getDatabase, ref, get, set, remove } from "firebase/database";
import { app } from "@/lib/firebase";

// --- UTILITIES ---
function toDateKey(d) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0]; // YYYY-MM-DD
}

// Get Sunday of the week (start of the week)
function getWeekStartDate(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun ... 6 = Sat
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - day); // go back to Sunday
  return sunday;
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
      // Remove weekoff
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

  // Generate calendar rows
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDate = new Date(year, month, 1);
    const lastDate = new Date(year, month + 1, 0);
    const firstDay = firstDate.getDay(); // 0 = Sun ... 6 = Sat
    const daysInMonth = lastDate.getDate();

    const weeks = [];
    let week = [];
    let dayCounter = 1;

    // Fill first week with empty cells if month doesn't start on Sunday
    for (let i = 0; i < firstDay; i++) {
      week.push(<td key={`empty-start-${i}`} />);
    }

    while (dayCounter <= daysInMonth) {
      const date = new Date(year, month, dayCounter);
      const dateKey = toDateKey(date);
      const isWeekOff = weekoffs[dateKey];

      week.push(
        <td
          key={dateKey}
          className={`p-2 text-center cursor-pointer rounded-lg ${
            isWeekOff ? "bg-red-500 text-white" : "hover:bg-gray-200"
          }`}
          onClick={() => handleDateClick(date)}
        >
          {dayCounter}
        </td>
      );

      if (week.length === 7) {
        weeks.push(<tr key={`week-${dayCounter}`}>{week}</tr>);
        week = [];
      }

      dayCounter++;
    }

    // Fill last week with empty cells if needed
    if (week.length > 0) {
      while (week.length < 7) {
        week.push(<td key={`empty-end-${week.length}`} />);
      }
      weeks.push(<tr key="last-week">{week}</tr>);
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
            {emp.id} - {emp.email} - {emp.name}
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
          {currentMonth.toLocaleString("default", { month: "long" })}{" "}
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
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
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
