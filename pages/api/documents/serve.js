import { getStorage } from "firebase-admin/storage";
import { db } from "../../../lib/firebaseAdmin";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }



  const { employeeId, password } = req.body;

  if (!employeeId || !password) {
    return res.status(400).json({ error: "Missing employeeId or password" });
  }

  try {
    // Step 1: Get all documents and find matching employeeId
    const snapshot = await db.ref("documents").once("value");
    const allRecords = snapshot.val();

    const matchedKey = Object.keys(allRecords || {}).find(
      key => allRecords[key].employeeId === employeeId.trim()
    );
    const employeeRecord = matchedKey ? allRecords[matchedKey] : null;

    if (!employeeRecord) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Step 2: Check password
    const isMatch = await bcrypt.compare(password, employeeRecord.hashedPassword);
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    // Step 3: Generate signed URLs for each uploaded file
    const storage = getStorage();
    const bucket = storage.bucket();

    const files = employeeRecord.files || {};
    const urls = {};

    for (const [key, filename] of Object.entries(files)) {
      const file = bucket.file(`documents/${filename}`);
      const [exists] = await file.exists();

      if (!exists) {
        urls[key] = null; // File listed in DB but missing in storage
        continue;
      }

      const [url] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      });

      urls[key] = url;
    }

    return res.status(200).json({
      success: true,
      urls, // { aadhar: '...', pan: '...', bank: '...', photo: '...' }
    });
  } catch (error) {
    console.error("❌ Error serving documents:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
