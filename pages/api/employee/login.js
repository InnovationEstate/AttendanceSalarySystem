import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const employeesFile = path.join(process.cwd(), "data", "employees.json");
const attendanceFile = path.join(process.cwd(), "data", "attendance.json");

const readJSON = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return [];
  }
};

const writeJSON = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { name, email, number, password, location, device } = req.body;

  if (!name || !email || !number || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const employees = readJSON(employeesFile);
  const attendance = readJSON(attendanceFile);

  // 🔐 Find the employee
  const employee = employees.find(
    (e) =>
      e.name.toLowerCase() === name.toLowerCase().trim() &&
      e.email.toLowerCase() === email.toLowerCase().trim() &&
      e.number === number.trim()
  );

  if (!employee) {
    return res.status(401).json({ error: "Employee not registered" });
  }

  // 🔐 Validate password
  if (!employee.password) {
    return res.status(403).json({ error: "Password not set for this employee." });
  }

  const passwordMatch = await bcrypt.compare(password, employee.password);
  if (!passwordMatch) {
    return res.status(401).json({ error: "Incorrect password" });
  }

  // 🕒 Time validation
  const nowUTC = new Date();
  const nowISTStr = nowUTC.toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
  });
  const nowIST = new Date(nowISTStr);

  const todayStr = nowIST.toISOString().split("T")[0];
  const hour = nowIST.getHours();
  const minute = nowIST.getMinutes();
  const totalMinutes = hour * 60 + minute;

  if (totalMinutes < 570) {
    return res.status(403).json({
      error: "Login not allowed before 9:30 AM IST",
    });
  }

  // 📝 Log attendance
  const alreadyLogged = attendance.find(
    (a) => a.date === todayStr && a.email.toLowerCase() === email.toLowerCase()
  );

  if (!alreadyLogged) {
    attendance.push({
      name,
      email,
      number,
      date: todayStr,
      login: nowUTC.toISOString(),
      istLoginTime: nowIST.toISOString(),
      location: {
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        address: location?.address || "Unknown",
      },
      device: device || null,
    });
    writeJSON(attendanceFile, attendance);
  }

  return res.status(200).json({
    success: true,
    employee: { name, email, number },
  });
}
