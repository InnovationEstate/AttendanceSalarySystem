import { db } from "../../../lib/firebase";
import { ref, get, update } from "firebase/database";
import bcrypt from "bcryptjs";

function toISTISOString(utcDate) {
  const istDate = new Date(
    utcDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  return istDate.toISOString();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { email, password, location, device } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Get employees from Firebase
    const snapshot = await get(ref(db, "employees"));
    if (!snapshot.exists()) {
      return res.status(404).json({ error: "No employee records found." });
    }
    const employeesObj = snapshot.val();

    // Find employee key by email (case insensitive, trimmed)
    const empKey = Object.keys(employeesObj).find(
      (key) =>
        employeesObj[key].email?.toLowerCase().trim() === email.toLowerCase().trim()
    );

    if (!empKey) {
      return res.status(401).json({ error: "Employee not registered" });
    }

    const matchedEmployee = employeesObj[empKey];

    // If password not set, tell frontend to redirect to set-password page
    if (!matchedEmployee.password) {
      return res.status(200).json({
        needPasswordSetup: true,
        email: matchedEmployee.email,
        message: "Password not set. Please set your password.",
      });
    }

    // Compare password
    const passwordMatch = await bcrypt.compare(password, matchedEmployee.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    // Sanitize email for attendance key
    const employeeEmailKey = matchedEmployee.email.replace(/[.#$[\]/]/g, "_");

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const istLoginTime = toISTISOString(now);

    // Attendance ref
    const attendanceRef = ref(db, `attendance/${dateStr}/${employeeEmailKey}`);
    const attendanceSnap = await get(attendanceRef);

    if (!attendanceSnap.exists()) {
      const attendanceRecord = {
        date: dateStr,
        email: matchedEmployee.email,
        name: matchedEmployee.name,
        number: matchedEmployee.number,
        login: now.toISOString(),
        istLoginTime,
        location: location || null,
        device: device || null,
      };
      await update(attendanceRef, attendanceRecord);
    }

    const attendanceData = attendanceSnap.exists()
      ? attendanceSnap.val()
      : {
          date: dateStr,
          email: matchedEmployee.email,
          name: matchedEmployee.name,
          number: matchedEmployee.number,
          login: now.toISOString(),
          istLoginTime,
          location: location || null,
          device: device || null,
        };

    return res.status(200).json({
      success: true,
      message: "Login successful",
      employee: {
        id: matchedEmployee.id,
        name: matchedEmployee.name,
        email: matchedEmployee.email,
        number: matchedEmployee.number,
        designation: matchedEmployee.designation || null,
        joiningDate: matchedEmployee.joiningDate || null,
        salary: matchedEmployee.salary || null,
      },
      attendance: attendanceData,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
