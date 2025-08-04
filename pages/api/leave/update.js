// pages/api/leave/update.js
import fs from 'fs';
import path from 'path';

const leavePath = path.join(process.cwd(), "data/leaveRequests.json");
const attendancePath = path.join(process.cwd(), "data/attendance.json");

export default function handler(req, res) {
  const { id, status } = JSON.parse(req.body);

  const leaveData = fs.existsSync(leavePath) ? JSON.parse(fs.readFileSync(leavePath)) : [];
  const attendanceData = fs.existsSync(attendancePath) ? JSON.parse(fs.readFileSync(attendancePath)) : [];

  const leave = leaveData.find(r => r.id === id);
  if (!leave) return res.status(404).json({ message: "Request not found" });

  leave.status = status;

  // If approved, mark attendance
  if (status === "approved") {
    const alreadyMarked = attendanceData.find(a => a.date === leave.date && a.email === leave.email);
    if (!alreadyMarked) {
      attendanceData.push({
        email: leave.email,
        date: leave.date,
        status: "Leave"
      });
      fs.writeFileSync(attendancePath, JSON.stringify(attendanceData, null, 2));
    }
  }

  fs.writeFileSync(leavePath, JSON.stringify(leaveData, null, 2));
  res.status(200).json({ message: "Leave status updated." });
}
