import bcrypt from "bcryptjs";
import formidable from "formidable";
import { db, bucket } from "../../../lib/firebaseAdmin"; // your admin SDK imports
import path from "path";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
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
          "Password must be 8 characters long and include uppercase, lowercase, number, and special character.",
      });
    }

    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Fetch existing record from Firebase DB
      const docRef = db.ref(`documents/${employeeId}`);
      const snapshot = await docRef.once("value");
      const existingRecord = snapshot.val() || { files: {} };
      const existingFiles = existingRecord.files || {};

      // Upload new files to Firebase Storage
      const uploadedFiles = {};

      for (const key in files) {
        const file = files[key];
        // formidable returns an array only if multiples true, else object
        // so normalize:
        const fileObj = Array.isArray(file) ? file[0] : file;

        const ext = path.extname(fileObj.originalFilename);
        const timestamp = Date.now();
        const filename = `${employeeId}_${key}_${timestamp}${ext}`;

        // Upload path in Storage
        const firebaseStoragePath = `documents/${employeeId}/${filename}`;

        // Upload file to Firebase Storage
        await bucket.upload(fileObj.filepath, {
          destination: firebaseStoragePath,
          metadata: {
            contentType: fileObj.mimetype,
          },
        });

        uploadedFiles[key] = filename;

        // Delete local temp file after upload
        fs.unlink(fileObj.filepath, (unlinkErr) => {
          if (unlinkErr) console.warn("Failed to delete temp file:", unlinkErr);
        });

        // Optional: Delete old file from Firebase Storage if replaced
        if (existingFiles[key]) {
          try {
            const oldFile = bucket.file(`documents/${employeeId}/${existingFiles[key]}`);
            await oldFile.delete();
          } catch (delErr) {
            console.warn("Failed to delete old file from storage:", delErr);
          }
        }
      }

      // Merge new and existing files metadata
      const updatedFiles = { ...existingFiles, ...uploadedFiles };

      // Save record back to Firebase Realtime Database
      await docRef.set({
        hashedPassword,
        files: updatedFiles,
      });

      return res.status(200).json({ success: true });
    } catch (uploadErr) {
      console.error("Upload error:", uploadErr);
      return res.status(500).json({ error: "Failed to upload files and save metadata" });
    }
  });
}
