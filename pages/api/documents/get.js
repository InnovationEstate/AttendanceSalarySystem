import { db, storage } from "../../../lib/firebaseAdmin"; // storage initialized from admin SDK

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { employeeId, docKey, isAdmin } = req.body;

  if (!employeeId || !docKey) {
    return res.status(400).json({ error: "Missing employeeId or docKey" });
  }

  try {
    // Get the file record from DB
    const snapshot = await db
      .ref(`documents/${employeeId}/files/${docKey}`)
      .once("value");
    const fileData = snapshot.val();

    if (!fileData || !fileData.path) {
      return res.status(404).json({ error: "File not found in database" });
    }

    // Generate signed URL from Storage
    const [url] = await storage
      .bucket()
      .file(fileData.path) // fileData.path should be the exact storage path like `documents/EMP001/aadhar.pdf`
      .getSignedUrl({
        action: "read",
        expires: Date.now() + 60 * 60 * 1000, // 1 hour expiry
      });

    return res.status(200).json({ success: true, url });
  } catch (error) {
    console.error("Error fetching file URL:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
