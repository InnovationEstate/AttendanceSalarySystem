import bcrypt from "bcryptjs";
import { db } from "../../../lib/firebaseAdmin";


export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
   

  const { employeeId, password } = req.body;

  if (!employeeId || !password) {
    return res.status(400).json({ error: "Missing employeeId or password" });
  }

  try {
    // Read all records from "documents"
    const snapshot = await db.ref("documents").once("value");
    const allRecords = snapshot.val();

    // Find the record where employeeId matches
    const matchedKey = Object.keys(allRecords || {}).find(
      key => allRecords[key].employeeId === employeeId.trim()
    );

    const employeeRecord = matchedKey ? allRecords[matchedKey] : null;

    if (!employeeRecord) {
      return res.status(404).json({ error: "Employee record not found" });
    }

    // Check password
    const match = await bcrypt.compare(password, employeeRecord.hashedPassword);
    if (!match) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    // Return only files (no storage URLs here, just file names)
    return res.status(200).json({ files: employeeRecord.files || {} });
  } catch (error) {
    console.error("❌ Error fetching document metadata:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
