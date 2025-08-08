"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  ref,
  onValue,
  set,
  remove,
} from "firebase/database";
import { getISTDateString } from "@/utils/attendanceUtils";

export default function CompanyHolidaysPage() {
  const [selectedDate, setSelectedDate] = useState(getISTDateString());
  const [reason, setReason] = useState("");
  const [holidays, setHolidays] = useState({});

  useEffect(() => {
    const holidayRef = ref(db, "companyHolidays");
    onValue(holidayRef, (snapshot) => {
      const data = snapshot.val() || {};
      setHolidays(data);
    });
  }, []);

  const toggleHoliday = async () => {
    const holidayRef = ref(db, `companyHolidays/${selectedDate}`);
    if (holidays[selectedDate]) {
      await remove(holidayRef);
    } else {
      if (!reason.trim()) {
        alert("Please enter a reason for the holiday.");
        return;
      }
      await set(holidayRef, { reason });
      setReason("");
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Manage Company Holidays</h1>

      <div className="mb-6">
        <label className="block mb-2 font-medium">Select Date</label>
        <input
          type="date"
          className="border p-2 rounded w-full"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      {!holidays[selectedDate] && (
        <div className="mb-4">
          <label className="block mb-2 font-medium">Occasion / Reason</label>
          <input
            type="text"
            className="border p-2 rounded w-full"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Independence Day"
          />
        </div>
      )}

      <button
        className="px-4 py-2 bg-blue-600 text-white rounded"
        onClick={toggleHoliday}
      >
        {holidays[selectedDate] ? "Remove Holiday" : "Mark as Holiday"}
      </button>

      <h2 className="text-xl font-semibold mt-8 mb-2">Upcoming Holidays</h2>
      <ul className="list-disc list-inside">
        {Object.entries(holidays)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, data]) => (
            <li key={date}>
              <strong>{date}:</strong> {data.reason}
            </li>
          ))}
      </ul>
    </div>
  );
}
