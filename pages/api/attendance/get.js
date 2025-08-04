// pages/api/attendance/get.js
import fs from 'fs';
import path from 'path';

const attendanceFile = path.join(process.cwd(), 'data', 'attendance.json');

const readJSON = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
};

export default function handler(req, res) {
  const attendance = readJSON(attendanceFile);
  res.status(200).json({ data: attendance });
}
