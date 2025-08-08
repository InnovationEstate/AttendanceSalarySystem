//pages
import bcrypt from "bcryptjs";
import formidable from "formidable";
import { db, bucket } from "../../../lib/firebaseAdmin";
import path from "path";
import fs from "fs/promises"; // Use promises version

export const config = {
  api: { bodyParser: false },
};

const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = new formidable.IncomingForm({ multiples: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form parse error:", err);
      return res.status(500).json({ error: "Form parsing failed" });
    }

    const { employeeId, password } = fields;
    if (!employeeId || !password) {
      return res.status(400).json({ error: "Missing employeeId or password" });
    }

    if (!strongPassword.test(password)) {
      return res.status(400).json({
        error:
          "Password must be 8+ characters with uppercase, lowercase, number, and special character.",
      });
    }

    try {
      const docRef = db.ref(`documents/${employeeId}`);
      const snapshot = await docRef.once("value");
      const existingRecord = snapshot.val() || { files: {} };
      const existingFiles = existingRecord.files || {};

      // Only hash password if new user
      let passwordToSave = existingRecord?.hashedPassword;
      if (!passwordToSave) {
        passwordToSave = await bcrypt.hash(password, 10);
      } else {
        // Optional: verify password here if required
      }

      const uploadedFiles = {};

      for (const key in files) {
        const file = Array.isArray(files[key]) ? files[key][0] : files[key];
        const ext = path.extname(file.originalFilename);
        const safeExt = ext || ".dat"; // fallback if ext missing
        const timestamp = Date.now();
        const rawFilename = `${employeeId}_${key}_${timestamp}${safeExt}`;
        const filename = rawFilename.replace(/[^a-zA-Z0-9_.-]/g, "_");
        const firebaseStoragePath = `documents/${employeeId}/${filename}`;

        // Upload to Firebase Storage
        await bucket.upload(file.filepath, {
          destination: firebaseStoragePath,
          metadata: {
            contentType: file.mimetype || "application/octet-stream",
          },
        });

        // Save file info
        uploadedFiles[key] = filename;

        // Delete local temp file
        try {
          await fs.unlink(file.filepath);
        } catch (unlinkErr) {
          console.warn("Failed to delete temp file:", unlinkErr);
        }

        // Optional: delete old file
        if (existingFiles[key]) {
          try {
            const oldFile = bucket.file(`documents/${employeeId}/${existingFiles[key]}`);
            await oldFile.delete();
          } catch (delErr) {
            console.warn("Failed to delete old file:", delErr.message);
          }
        }
      }

      const updatedFiles = { ...existingFiles, ...uploadedFiles };

     await docRef.update({
  employeeId,
  hashedPassword: passwordToSave,
  files: updatedFiles,
});


      return res.status(200).json({ success: true });
    } catch (uploadErr) {
      console.error("Upload error:", uploadErr);
      return res.status(500).json({ error: "Failed to upload files and save metadata" });
    }
  });
}
