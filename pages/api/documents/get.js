import bcrypt from "bcryptjs";
import { db } from "../../../lib/firebaseAdmin"; // your Firebase Admin SDK import

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { employeeId, password, isAdmin } = req.body;

  if (!employeeId) {
    return res.status(400).json({ error: "Missing employeeId" });
  }

  try {
    const docRef = db.ref(`documents/${employeeId}`);
    const snapshot = await docRef.once("value");
    const employeeRecord = snapshot.val();

    if (!employeeRecord) {
      return res.status(404).json({ error: "Employee record not found" });
    }

    // Allow admin access without password
    if (!isAdmin) {
      if (!password) {
        return res.status(400).json({ error: "Missing password" });
      }
      const match = await bcrypt.compare(password, employeeRecord.hashedPassword);
      if (!match) {
        return res.status(401).json({ error: "Incorrect password" });
      }
    }

    return res.status(200).json({ files: employeeRecord.files || {} });
  } catch (error) {
    console.error("Error fetching document metadata:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
