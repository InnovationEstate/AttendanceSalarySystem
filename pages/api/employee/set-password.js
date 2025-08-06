import { db } from "../../../lib/firebase";
import { ref, get, set, update } from "firebase/database";
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
    const empKey = email.replace(/\./g, "_");
    const empRef = ref(db, `employees/${empKey}`);
    const snapshot = await get(empRef);

    if (!snapshot.exists()) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const existingData = snapshot.val();
    if (existingData.password && existingData.password !== "") {
      return res
        .status(400)
        .json({ error: "Password already set for this employee" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await update(empRef, { password: hashedPassword });

    console.log(`✅ Password set for ${email}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Firebase set-password error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
