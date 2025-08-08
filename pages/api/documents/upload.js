// import formidable from "formidable";
// import { getStorage } from "firebase-admin/storage";
// import { db } from "../../../lib/firebaseAdmin"; // your Firebase Admin SDK initialized instance
// import bcrypt from "bcryptjs";
// import path from "path";
// import fs from "fs";

// export const config = {
//   api: { bodyParser: false }, // required for formidable
// };

// export default async function handler(req, res) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method Not Allowed" });
//   }

//   try {
//     // Parse form data
//     const form = new formidable.IncomingForm({
//       multiples: true,
//       keepExtensions: true,
//       maxFileSize: 10 * 1024 * 1024, // optional max file size (10MB)
//     });

//     const data = await new Promise((resolve, reject) => {
//       form.parse(req, (err, fields, files) => {
//         if (err) reject(err);
//         else resolve({ fields, files });
//       });
//     });

//     const { fields, files } = data;
//     const employeeId = Array.isArray(fields.employeeId) ? fields.employeeId[0] : fields.employeeId;
//     const password = Array.isArray(fields.password) ? fields.password[0] : fields.password;

//     if (!employeeId || !password) {
//       return res.status(400).json({ error: "Missing employeeId or password" });
//     }

//     // Password strength check
//     const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
//     if (!strongPasswordRegex.test(password)) {
//       return res.status(400).json({ error: "Password not strong enough" });
//     }

//     // Fetch metadata from Firebase DB
//     const docRef = db.ref(`documents/${employeeId}`);
//     const snapshot = await docRef.once("value");
//     const existingRecord = snapshot.val();

//     let hashedPassword = null;

//     if (!existingRecord) {
//       // New user → hash password and create record
//       hashedPassword = await bcrypt.hash(password, 10);
//     } else {
//       // Existing user → verify password
//       const match = await bcrypt.compare(password, existingRecord.hashedPassword);
//       if (!match) return res.status(401).json({ error: "Incorrect password" });

//       hashedPassword = existingRecord.hashedPassword;
//     }

//     // Prepare to upload files to Firebase Storage
//     const storage = getStorage();
//     const bucket = storage.bucket();

//     // Files map to keep updated filenames for DB
//     const updatedFiles = existingRecord?.files || {};

//     for (const docKey in files) {
//       let file = files[docKey];
//       if (!file) continue;

//       if (Array.isArray(file)) file = file[0]; // handle multiple files

//       // Generate a safe unique filename
//       const ext = path.extname(file.originalFilename || "");
//       const safeName = `${employeeId}_${docKey}_${Date.now()}${ext}`;

//       // Upload to Firebase Storage under documents/<employeeId>/
//       const destination = `documents/${employeeId}/${safeName}`;

//       await bucket.upload(file.filepath, {
//         destination,
//         metadata: {
//           contentType: file.mimetype || "application/octet-stream",
//         },
//       });

//       // Update file name reference
//       updatedFiles[docKey] = safeName;

//       // Remove temp file
//       fs.unlinkSync(file.filepath);
//     }

//     // Save updated metadata back to Realtime DB
//     await docRef.set({
//       employeeId,
//       hashedPassword,
//       files: updatedFiles,
//     });

//     return res.status(200).json({ success: true });
//   } catch (error) {
//     console.error("Upload error:", error);
//     return res.status(500).json({ error: "Unexpected server error" });
//   }
// }

import formidable from "formidable";
import { getStorage } from "firebase-admin/storage";
import { db } from "../../../lib/firebaseAdmin";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs/promises";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const form = new formidable.IncomingForm({
      multiples: true,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const data = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const { fields, files } = data;
    const employeeId = Array.isArray(fields.employeeId) ? fields.employeeId[0] : fields.employeeId;
    const password = Array.isArray(fields.password) ? fields.password[0] : fields.password;

    if (!employeeId || !password) {
      return res.status(400).json({ error: "Missing employeeId or password" });
    }

    // Password strength check
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      return res.status(400).json({ error: "Password must be 8+ characters, include upper/lowercase, number, and special char." });
    }

    // Reference to Realtime DB
    const docRef = db.ref(`documents/${employeeId}`);
    const snapshot = await docRef.once("value");
    const existingData = snapshot.val();

    let hashedPassword = null;
    const existingFiles = existingData?.files || {};
    const updatedFiles = { ...existingFiles };

    if (!existingData) {
      // New employee: hash and store password
      hashedPassword = await bcrypt.hash(password, 10);
    } else {
      const match = await bcrypt.compare(password, existingData.hashedPassword);
      if (!match) return res.status(401).json({ error: "Incorrect password" });
      hashedPassword = existingData.hashedPassword;
    }

    if (files && Object.keys(files).length > 0) {
      const storage = getStorage();
      const bucket = storage.bucket();

      for (const key of Object.keys(files)) {
        const fileData = Array.isArray(files[key]) ? files[key][0] : files[key];
        const ext = path.extname(fileData.originalFilename || "");
        const filename = `${employeeId}_${key}_${Date.now()}${ext}`;
        const firebasePath = `documents/${employeeId}/${filename}`;

        // Upload file to Firebase Storage
        await bucket.upload(fileData.filepath, {
          destination: firebasePath,
          metadata: {
            contentType: fileData.mimetype || "application/octet-stream",
          },
        });

        // Update record
        updatedFiles[key] = filename;

        // Remove temp file
        try {
          await fs.unlink(fileData.filepath);
        } catch (unlinkErr) {
          console.warn("Failed to remove temp file:", unlinkErr);
        }

        // Optionally delete old file from storage
        if (existingFiles[key] && existingFiles[key] !== filename) {
          try {
            await bucket.file(`documents/${employeeId}/${existingFiles[key]}`).delete();
          } catch (err) {
            console.warn("Failed to delete old file:", err.message);
          }
        }
      }
    }

    // Save to Realtime DB
    await docRef.set({
      hashedPassword,
      files: updatedFiles,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}
