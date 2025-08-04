// pages/api/leave/list.js
import fs from 'fs';
import path from 'path';

const leavePath = path.join(process.cwd(), "data/leaveRequests.json");

export default function handler(req, res) {
  const data = fs.existsSync(leavePath) ? JSON.parse(fs.readFileSync(leavePath)) : [];
  res.status(200).json(data);
}
