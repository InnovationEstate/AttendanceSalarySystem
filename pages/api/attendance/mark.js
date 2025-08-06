import { getDatabase, ref, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { getCurrentISTDate, getCurrentISTTime } from "../../../utils/attendanceUtils";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
      allowedMethods: ["POST"],
    });
  }

  try {
    // You should replace this with your actual auth logic to get user ID
    const userId = req.user?.id || req.body.employeeId;
    const name = req.body.name || "Unknown";
    const email = req.body.email || "unknown@example.com";

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - No employee identified",
      });
    }

    // Get current IST date and time
    const dateStr = getCurrentISTDate(); // e.g. '2025-08-06'
    const timeStr = getCurrentISTTime(); // e.g. '09:45:00'

    // Path structure: /attendance/{date}/{userId}
    const attendancePath = `attendance/${dateStr}/${userId}`;

    // Prepare attendance data
    const attendanceData = {
      userId,
      name,
      email,
      date: dateStr,
      time: timeStr,
      updatedAt: new Date().toISOString(),
      // you can add location, device info here if available from req.body
      location: req.body.location || null,
      device: req.body.device || null,
      status: "present", // customize if you want to add logic for status
    };

    // Update attendance record at the path
    await update(ref(db, attendancePath), attendanceData);

    return res.status(200).json({
      success: true,
      message: "Attendance marked successfully",
      data: attendanceData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error marking attendance:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}
