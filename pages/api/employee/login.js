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
    const { name, email, number, password, location, device } = req.body;

    if (!name || !email || !number || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const snapshot = await get(ref(db, "employees"));
    if (!snapshot.exists()) {
      return res.status(404).json({ error: "No employee records found." });
    }

    const employees = Object.values(snapshot.val());

    const matchedEmployee = employees.find(
      (emp) =>
        emp.email?.toLowerCase() === email.toLowerCase() &&
        emp.name === name &&
        emp.number === number
    );

    if (!matchedEmployee) {
      return res.status(401).json({ error: "Employee not registered" });
    }

    const passwordMatch = await bcrypt.compare(password, matchedEmployee.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    const employeeEmailKey = matchedEmployee.email.replace(/[.#$[\]/]/g, "_");

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const istLoginTime = toISTISOString(now);

    // Firebase path: attendance/yyyy-mm-dd/employeeEmailKey
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

    // Return attendance info to frontend
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
        name: matchedEmployee.name,
        email: matchedEmployee.email,
        number: matchedEmployee.number,
      },
      attendance: attendanceData,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
