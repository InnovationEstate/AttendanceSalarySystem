import bcrypt from "bcryptjs";
import { db } from "../../../lib/firebaseAdmin"; // Make sure this file exists and exports initialized admin.database()

const dummyHash = "$2a$10$zV9M9pN8rNd9xGgmZP/jMezW/MkgV4EfZ5t06EKc6Eq19VJhvEi32"; // bcrypt hash of "dummy"

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  const { employeeId, password } = req.body;

  if (
    !employeeId ||
    typeof employeeId !== "string" ||
    !password ||
    typeof password !== "string"
  ) {
    return res
      .status(400)
      .json({ error: "Missing or invalid employeeId or password" });
  }

  try {
    const snapshot = await db.ref(`documents/${employeeId.trim()}`).once("value");
    const employeeRecord = snapshot.val();

    if (!employeeRecord) {
      // Run dummy bcrypt to avoid timing attack
      await bcrypt.compare(password, dummyHash);
      return res.status(404).json({
        error: "Employee not registered yet. Please create your password first.",
      });
    }

    const isMatch = await bcrypt.compare(password, employeeRecord.hashedPassword);
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    return res.status(200).json({
      success: true,
      files: employeeRecord.files || {},
    });
  } catch (err) {
    console.error("🔥 Error in verify.js:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
