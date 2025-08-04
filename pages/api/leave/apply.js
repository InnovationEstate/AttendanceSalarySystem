// pages/api/leave/apply.js
import fs from 'fs';
import path from 'path';

const leavePath = path.join(process.cwd(), "data/leaveRequests.json");

export default function handler(req, res) {
  if (req.method === "POST") {
    const { email, date, reason } = JSON.parse(req.body);
    const data = fs.existsSync(leavePath) ? JSON.parse(fs.readFileSync(leavePath)) : [];

    // Prevent duplicate for same date
    if (data.find(r => r.email === email && r.date === date)) {
      return res.status(400).json({ message: "Already applied for this date." });
    }

    data.push({
      id: `leave_${Date.now()}`,
      email,
      date,
      reason,
      status: "pending",
      timestamp: new Date().toISOString()
    });

    fs.writeFileSync(leavePath, JSON.stringify(data, null, 2));
    return res.status(200).json({ message: "Leave request submitted." });
  }
}
