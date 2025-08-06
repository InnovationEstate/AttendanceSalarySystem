import { db } from "../../../lib/firebaseAdmin"; // Your Firebase Admin SDK initialized here
import { ref, get, update, set, push } from "firebase/database";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { id, status } = req.body;

  if (!id || !status) {
    return res.status(400).json({ message: "Missing id or status" });
  }

  try {
    // Fetch leave requests
    const leaveSnap = await get(ref(db, "leaveRequests"));
    const leaveData = leaveSnap.val() || {};

    // Find leave request by id
    const leaveEntryKey = Object.keys(leaveData).find(key => leaveData[key].id === id);
    if (!leaveEntryKey) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    const leaveEntry = leaveData[leaveEntryKey];

    // Update leave status
    await update(ref(db, `leaveRequests/${leaveEntryKey}`), { status });

    // If approved, mark attendance
    if (status === "approved") {
      // Fetch attendance data
      const attendanceSnap = await get(ref(db, "attendance"));
      const attendanceData = attendanceSnap.val() || {};

      // Check if attendance already marked for that email and date
      const attendanceExists = Object.values(attendanceData).some(
        (a) => a.email === leaveEntry.email && a.date === leaveEntry.date
      );

      if (!attendanceExists) {
        // Push new attendance record
        const newAttendanceRef = push(ref(db, "attendance"));
        await set(newAttendanceRef, {
          email: leaveEntry.email,
          date: leaveEntry.date,
          status: "Leave",
        });
      }
    }

    res.status(200).json({ message: "Leave status updated." });
  } catch (error) {
    console.error("Error updating leave:", error);
    res.status(500).json({ message: "Failed to update leave status." });
  }
}
