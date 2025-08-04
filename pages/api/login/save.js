// pages/api/login/save.js
import fs from 'fs';
import path from 'path';

const employeesFile = path.join(process.cwd(), 'data', 'employees.json');
const attendanceFile = path.join(process.cwd(), 'data', 'attendance.json');

const readJSON = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
};

const writeJSON = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, number, latitude, longitude, address } = req.body;

  if (!email || !number) {
    return res.status(400).json({ error: 'Missing email or number' });
  }

  const employees = readJSON(employeesFile);
  const employee = employees.find(
    (e) =>
      e.email.toLowerCase() === email.toLowerCase() &&
      e.number === number
  );

  if (!employee) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const attendance = readJSON(attendanceFile);
  const now = new Date();
  const todayDate = now.toISOString().slice(0, 10);

  const alreadyLogged = attendance.find(
    (a) => a.email.toLowerCase() === email.toLowerCase() && a.date === todayDate
  );

  if (alreadyLogged) {
    return res.status(200).json({ message: 'Already logged in today', attendance: alreadyLogged });
  }

  const newAttendance = {
    email: employee.email,
    name: employee.name,
    date: todayDate,
    login: now.toISOString(),
    latitude: latitude || null,
    longitude: longitude || null,
    address: address || 'N/A',
  };

  attendance.push(newAttendance);
  writeJSON(attendanceFile, attendance);

  return res.status(200).json({ message: 'Login recorded', attendance: newAttendance });
}
