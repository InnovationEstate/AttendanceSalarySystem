import { db } from "../../../lib/firebase";
import { ref, get } from "firebase/database";
import bcrypt from "bcrypt";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { name, email, number, password, location, device } = req.body;

    const snapshot = await get(ref(db, "employees"));

    if (!snapshot.exists()) {
      return res.status(404).json({ error: "No employee records found." });
    }

    // Your structure is array-like: [ {...}, {...} ]
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

    // Optionally log location/device to attendance logs here

    return res.status(200).json({
      success: true,
      message: "Login successful",
      employee: {
        name: matchedEmployee.name,
        email: matchedEmployee.email,
        number: matchedEmployee.number,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
