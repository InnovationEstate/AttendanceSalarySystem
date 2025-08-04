import formidable from "formidable";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

export const config = {
  api: { bodyParser: false }, // Required for formidable
};

const uploadsDir = path.join(process.cwd(), "uploads-private");
const metadataFile = path.join(process.cwd(), "data", "documents.json");

// Ensure uploads and data directories exist
function ensureUploadsDir() {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
}

function ensureMetadataFile() {
  if (!fs.existsSync(metadataFile)) {
    fs.mkdirSync(path.dirname(metadataFile), { recursive: true });
    fs.writeFileSync(metadataFile, "[]", "utf-8");
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    ensureUploadsDir();
    ensureMetadataFile();

    const form = formidable({
      multiples: true,
      uploadDir: uploadsDir,
      keepExtensions: true,
    });

    // Parse form using Promise to use try-catch cleanly
    const data = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

    const { fields, files } = data;
    const employeeId = Array.isArray(fields.employeeId) ? fields.employeeId[0] : fields.employeeId;
    const password = Array.isArray(fields.password) ? fields.password[0] : fields.password;

    if (!employeeId || !password) {
      return res.status(400).json({ error: "Missing employeeId or password" });
    }

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      return res.status(400).json({ error: "Password not strong enough" });
    }

    // Read metadata file
    let metadata = [];
    try {
      const rawData = fs.readFileSync(metadataFile, "utf-8");
      metadata = JSON.parse(rawData);
    } catch (err) {
      console.error("Failed to parse metadata file:", err);
      return res.status(500).json({ error: "Failed to read metadata" });
    }

    let employeeRecord = metadata.find((e) => e.employeeId === employeeId);

    if (!employeeRecord) {
      const hashedPassword = await bcrypt.hash(password, 10);
      employeeRecord = { employeeId, hashedPassword, files: {} };
      metadata.push(employeeRecord);
    } else {
      const match = await bcrypt.compare(password, employeeRecord.hashedPassword);
      if (!match) {
        return res.status(401).json({ error: "Incorrect password" });
      }
    }

    // Save each file
    for (const docKey in files) {
      const file = files[docKey];
      if (!file) continue;

      const f = Array.isArray(file) ? file[0] : file;
      const ext = path.extname(f.originalFilename || "");
      const safeName = `${employeeId}_${docKey}_${Date.now()}${ext}`;
      const destPath = path.join(uploadsDir, safeName);

      try {
        fs.renameSync(f.filepath, destPath);
        employeeRecord.files[docKey] = safeName;
      } catch (moveErr) {
        console.error(`Failed to move file ${docKey}:`, moveErr);
        return res.status(500).json({ error: `Failed to save ${docKey}` });
      }
    }

    // Write metadata back
    try {
      fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2), "utf-8");
    } catch (writeErr) {
      console.error("Failed to save metadata file:", writeErr);
      return res.status(500).json({ error: "Failed to update metadata" });
    }

    return res.status(200).json({ success: true });

  } catch (outerErr) {
    console.error("Unexpected server error:", outerErr);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}
