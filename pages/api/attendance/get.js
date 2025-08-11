// pages/api/attendance/get.js
import { db } from "../../../lib/firebase";
import { ref, get } from "firebase/database";

export default async function handler(req, res) {
  try {
    // Fetch attendance data (unchanged)
    const attendanceRef = ref(db, "attendance");
    const attendanceSnap = await get(attendanceRef);

    let attendanceRecords = [];
    if (attendanceSnap.exists()) {
      const attendanceData = attendanceSnap.val(); // { "2025-08-01": { id1: {...}, ... }, ... }

      for (const date in attendanceData) {
        const dailyRecords = attendanceData[date];
        for (const id in dailyRecords) {
          attendanceRecords.push(dailyRecords[id]);
        }
      }
    }

    // Fetch company holidays data
    const holidaysRef = ref(db, "companyHolidays");
    const holidaysSnap = await get(holidaysRef);

    let holidays = [];
    if (holidaysSnap.exists()) {
      const holidaysData = holidaysSnap.val(); // { "2025-08-09": { reason: "Rakshabandhan" }, ... }
      holidays = Object.keys(holidaysData).map((date) => ({
        date,
        reason: holidaysData[date].reason,
      }));
    }

    // Return combined data
    return res.status(200).json({ data: attendanceRecords, holidays });
  } catch (err) {
    console.error("❌ Error fetching attendance or holidays:", err);
    return res.status(500).json({ error: "Failed to fetch attendance and holidays" });
  }
}
