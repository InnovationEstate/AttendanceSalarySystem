import { getStorage } from "firebase-admin/storage";
import { db } from "../../../lib/firebaseAdmin"; // your Firebase Admin SDK init file
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { employeeId, password, docKey, isAdmin } = req.body;

  if (!employeeId || !docKey) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    // Fetch document metadata from Firebase Realtime DB
    const docRef = db.ref(`documents/${employeeId}`);
    const snapshot = await docRef.once("value");
    const employeeRecord = snapshot.val();

    if (!employeeRecord) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Validate password if not admin
    if (!isAdmin) {
      if (!password) return res.status(400).json({ error: "Password required" });

      const match = await bcrypt.compare(password, employeeRecord.hashedPassword);
      if (!match) return res.status(401).json({ error: "Unauthorized" });
    }

    const filename = employeeRecord.files?.[docKey];
    if (!filename) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Generate Firebase Storage download URL
    const storage = getStorage();
    const bucket = storage.bucket();

    // Assuming files are saved in a folder named 'documents' inside the bucket
    const file = bucket.file(`documents/${filename}`);

    // Generate signed URL valid for 15 minutes
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    });

    // Redirect client to the signed URL to view/download
    return res.status(200).json({ url });
  } catch (error) {
    console.error("Error serving document:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
