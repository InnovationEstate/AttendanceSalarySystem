import { db } from "../../../lib/firebase";
import { ref, get, update } from "firebase/database";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password" });
  }

  try {
    // Get all employees
    const snapshot = await get(ref(db, "employees"));
    if (!snapshot.exists()) {
      return res.status(404).json({ error: "No employee records found." });
    }
    const employeesObj = snapshot.val();

    // Find employee key by email (case-insensitive)
    const empKey = Object.keys(employeesObj).find(
      (key) =>
        employeesObj[key].email?.toLowerCase().trim() === email.toLowerCase().trim()
    );

    if (!empKey) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const employee = employeesObj[empKey];
    if (employee.password && employee.password !== "") {
      return res
        .status(400)
        .json({ error: "Password already set for this employee" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const empRef = ref(db, `employees/${empKey}`);

    await update(empRef, { password: hashedPassword });

    console.log(`✅ Password set for ${email}`);
    return res.status(200).json({ success: true, message: "Password set successfully" });
  } catch (err) {
    console.error("❌ Firebase set-password error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
