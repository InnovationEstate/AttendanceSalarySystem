"use client";

import { useState, useEffect } from "react";
import { getDatabase, ref, get, set, remove, update } from "firebase/database";
import { app } from "@/lib/firebase";
import Select from "react-select";

// --- UTILITIES ---
function toDateKey(d) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0]; // YYYY-MM-DD
}

function getWeekStartDate(date) {
  const d = new Date(date);
  const day = d.getDay();
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - day);
  return sunday;
}

function getAllSpecificDays(year, month, targetDay) {
  const result = [];
  const date = new Date(year, month, 1);

  while (date.getMonth() === month) {
    if (date.getDay() === targetDay) {
      result.push(toDateKey(new Date(date)));
    }
    date.setDate(date.getDate() + 1);
  }
  return result;
}

// returns YYYY-MM-DD strings for all days in week containing date d
function getWeekDateKeys(d) {
  const start = getWeekStartDate(d);
  const keys = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    keys.push(toDateKey(x));
  }
  return keys;
}

export default function WeekOffPage() {
  const db = getDatabase(app);

  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState("");
  const [weekoffs, setWeekoffs] = useState({}); // { "YYYY-MM-DD": true }
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [defaultDay, setDefaultDay] = useState("0");

  // Fetch employees once
  useEffect(() => {
    const fetchEmployees = async () => {
      const snap = await get(ref(db, "employees"));
      if (snap.exists()) {
        // keep structure as array of employee objects (must include emp.id)
        setEmployees(Object.values(snap.val()));
      }
    };
    fetchEmployees();
  }, [db]);

  // Fetch weekoffs for selected employee
  useEffect(() => {
    if (!selectedEmp) {
      setWeekoffs({});
      return;
    }
    const fetchWeekoffs = async () => {
      const snap = await get(ref(db, `weekoffs/${selectedEmp}`));
      if (snap.exists()) setWeekoffs(snap.val());
      else setWeekoffs({});
    };
    fetchWeekoffs();
  }, [db, selectedEmp]);

  // MANUAL: clicking a date toggles it. Enforce exactly one per week.
  const handleDateClick = async (date) => {
    if (!selectedEmp) {
      alert("Select employee first!");
      return;
    }

    const dateKey = toDateKey(date);
    const empRoot = `weekoffs/${selectedEmp}`;
    const updates = {};

    // if clicked date was already a weekoff -> remove only it
    if (weekoffs[dateKey]) {
      updates[`${empRoot}/${dateKey}`] = null;
      await update(ref(db), updates);

      setWeekoffs((prev) => {
        const next = { ...prev };
        delete next[dateKey];
        return next;
      });
      return;
    }

    // Otherwise clear any other day in the same week (if present) then set this date
    const weekKeys = getWeekDateKeys(date);
    for (const k of weekKeys) {
      if (k !== dateKey && weekoffs[k]) {
        updates[`${empRoot}/${k}`] = null;
      }
    }
    updates[`${empRoot}/${dateKey}`] = true;

    await update(ref(db), updates);

    // Update local state in a single atomic local step
    setWeekoffs((prev) => {
      const next = { ...prev };
      for (const k of weekKeys) {
        if (k !== dateKey && next[k]) delete next[k];
      }
      next[dateKey] = true;
      return next;
    });
  };

  // DEFAULT: Set default weekday for ALL employees for the current month.
  // Enforce only-one-per-week by clearing other days in those weeks first.
  const setDefaultWeekoffForAll = async (day) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateKeys = getAllSpecificDays(year, month, day); // strings YYYY-MM-DD

    if (employees.length === 0) {
      alert("No employees to set.");
      return;
    }

    const updates = {};
    for (const emp of employees) {
      for (const dKey of dateKeys) {
        const d = new Date(dKey);
        const weekKeys = getWeekDateKeys(d);

        // remove any existing day in that week
        for (const k of weekKeys) {
          if (k !== dKey) updates[`weekoffs/${emp.id}/${k}`] = null;
        }
        // set the chosen day
        updates[`weekoffs/${emp.id}/${dKey}`] = true;
      }
    }

    await update(ref(db), updates);

    alert(
      `Default weekoff (${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]}) set for all employees!`
    );

    // refresh view for selected employee
    if (selectedEmp) {
      const snap = await get(ref(db, `weekoffs/${selectedEmp}`));
      setWeekoffs(snap.exists() ? snap.val() : {});
    }
  };

  // Remove default: delete only the chosen weekday's dates for the current month across all employees.
  const removeDefaultWeekoffForAll = async (day) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateKeys = getAllSpecificDays(year, month, day);

    if (employees.length === 0) {
      alert("No employees to update.");
      return;
    }

    const updates = {};
    for (const emp of employees) {
      for (const dKey of dateKeys) {
        updates[`weekoffs/${emp.id}/${dKey}`] = null;
      }
    }

    await update(ref(db), updates);

    alert(
      `Default weekoff (${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]}) removed for all employees!`
    );

    if (selectedEmp) {
      const snap = await get(ref(db, `weekoffs/${selectedEmp}`));
      setWeekoffs(snap.exists() ? snap.val() : {});
    }
  };

  // Calendar renderer
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDate = new Date(year, month, 1);
    const lastDate = new Date(year, month + 1, 0);
    const firstDay = firstDate.getDay();
    const daysInMonth = lastDate.getDate();

    const weeks = [];
    let week = [];
    let dayCounter = 1;

    // leading blanks
    for (let i = 0; i < firstDay; i++) {
      week.push(<td key={`empty-start-${i}`} />);
    }

    while (dayCounter <= daysInMonth) {
      const date = new Date(year, month, dayCounter);
      const dateKey = toDateKey(date);
      const isWeekOff = !!weekoffs[dateKey];

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

    // trailing blanks
    if (week.length > 0) {
      while (week.length < 7) {
        week.push(<td key={`empty-end-${week.length}`} />);
      }
      weeks.push(<tr key="last-week">{week}</tr>);
    }

    return weeks;
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Top Controls: Employee (left) + Default (right) */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-6 mb-6">
        {/* Employee selector (left) */}
        <div className="w-full sm:w-1/3 min-w-0">
          <h2 className="text-lg sm:text-xl font-bold mb-3">Set Employee Weekoffs</h2>
          <Select
            options={employees.map((emp) => ({
              value: emp.id,
              label: `${emp.id} - ${emp.email} - ${emp.name}`,
            }))}
            value={
              employees
                .map((emp) => ({ value: emp.id, label: `${emp.id} - ${emp.email} - ${emp.name}` }))
                .find((opt) => opt.value === selectedEmp) || null
            }
            onChange={(option) => setSelectedEmp(option ? option.value : "")}
            placeholder="Search or select employee..."
            isClearable
            isSearchable
            className="w-full"
          />
        </div>

        {/* Default weekoffs (right) */}
        <div className="w-full sm:w-2/3 min-w-0">
          <h2 className="text-lg sm:text-xl font-bold mb-3">Set Default Weekoffs</h2>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="w-full sm:w-1/2">
              <select
                className="border p-2 rounded w-full"
                value={defaultDay}
                onChange={(e) => setDefaultDay(e.target.value)}
              >
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
              </select>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                className="px-3 py-2 border rounded bg-blue-500 text-white w-full sm:w-auto"
                onClick={() => setDefaultWeekoffForAll(parseInt(defaultDay))}
              >
                Set for All
              </button>
              <button
                className="px-3 py-2 border rounded bg-red-500 text-white w-full sm:w-auto"
                onClick={() => removeDefaultWeekoffForAll(parseInt(defaultDay))}
              >
                Remove Default
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar navigation */}
      <div className="flex justify-between items-center mb-2">
        <button
          className="px-3 py-1 border rounded"
          onClick={() =>
            setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
          }
        >
          Prev
        </button>

        <h3 className="font-semibold text-sm sm:text-base">
          {currentMonth.toLocaleString("default", { month: "long" })} {currentMonth.getFullYear()}
        </h3>

        <button
          className="px-3 py-1 border rounded"
          onClick={() =>
            setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
          }
        >
          Next
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs sm:text-sm">
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
      </div>

      <p className="mt-4 text-xs sm:text-sm text-gray-600">
        🔴 Red = Weekoff (Click to remove) | ⚪ White = Available
      </p>
    </div>
  );
}
