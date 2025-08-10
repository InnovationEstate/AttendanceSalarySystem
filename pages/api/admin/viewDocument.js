import { db } from "../../../lib/firebaseAdmin"; // your admin SDK init

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { employeeId, fileKey } = req.body; // fileKey like "aadhar", "bank", etc.

  if (!employeeId || !fileKey) {
    return res.status(400).json({ error: "Missing employeeId or fileKey" });
  }

  try {
    // Fetch the file record from Realtime Database
    const snapshot = await db
      .ref(`documents/${employeeId}/files/${fileKey}`)
      .once("value");

    const fileData = snapshot.val();

    if (!fileData || !fileData.url) {
      return res.status(404).json({ error: "File not found" });
    }

    // Return the public Firebase Storage URL
    return res.status(200).json({
      success: true,
      url: fileData.url
    });
  } catch (error) {
    console.error("❌ Error retrieving document:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
