import bcrypt from "bcryptjs";
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = admin.database();

export const config = {
  api: {
    bodyParser: true, // Enable default body parsing for JSON form data
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { employeeId, password, files } = req.body;

    if (
      !employeeId || typeof employeeId !== "string" ||
      !password || typeof password !== "string"
    ) {
      return res.status(400).json({ error: "Employee ID and password are required" });
    }

    // `files` should be JSON object containing file metadata, e.g.:
    // { aadhar: { name: "documents/emp1/aadhar_12345.pdf", originalName: "aadhar.pdf" }, ... }
    const filesMetadata = typeof files === "string" ? JSON.parse(files) : files || {};

    // Fetch existing record
    const docRef = db.ref(`documents/${employeeId}`);
    const snapshot = await docRef.once("value");
    const existingRecord = snapshot.val() || {};

    let hashedPassword = existingRecord.hashedPassword;
    const isNewUser = !hashedPassword;

    if (isNewUser) {
      hashedPassword = await bcrypt.hash(password, 10);
    } else {
      const match = await bcrypt.compare(password, hashedPassword);
      if (!match) {
        return res.status(403).json({ error: "Incorrect password" });
      }
    }

    // Merge existing files with new files metadata sent by client
    const updatedFiles = {
      ...(existingRecord.files || {}),
      ...filesMetadata,
    };

    await docRef.set({
      employeeId,
      hashedPassword,
      files: updatedFiles,
    });

    return res.status(200).json({
      success: true,
      message: isNewUser
        ? "Password set and documents metadata saved successfully"
        : "Documents metadata updated successfully",
      files: updatedFiles,
      isNewUser,
    });

  } catch (err) {
    console.error("Upload API error:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
}
