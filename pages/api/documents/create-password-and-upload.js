import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import formidable from "formidable";

export const config = {
  api: {
    bodyParser: false,
  },
};

const metadataFile = path.join(process.cwd(), "data", "documents.json");
const uploadsDir = path.join(process.cwd(), "uploads-private");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = new formidable.IncomingForm({
    multiples: true,
    uploadDir: uploadsDir,
    keepExtensions: true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Error parsing form:", err);
      return res.status(500).json({ error: "Form parsing failed" });
    }

    const { employeeId, password } = fields;
    if (!employeeId || !password) {
      return res.status(400).json({ error: "Missing employeeId or password" });
    }

    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    // Validate password strength (for new users only)
    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPassword.test(password)) {
      return res.status(400).json({
        error: "Password must be 8 characters long and include uppercase, lowercase, number, and special character.",
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Read existing metadata
    let existing = [];
    if (fs.existsSync(metadataFile)) {
      try {
        existing = JSON.parse(fs.readFileSync(metadataFile, "utf-8"));
      } catch (e) {
        return res.status(500).json({ error: "Corrupted metadata file" });
      }
    }

    const index = existing.findIndex((e) => e.employeeId === employeeId);
    const existingFiles = index !== -1 ? existing[index].files || {} : {};

    // Process file uploads
    const uploadedFiles = {};

    for (const key in files) {
      const file = files[key][0];
      const fileName = `${employeeId}_${key}_${Date.now()}${path.extname(file.originalFilename)}`;
      const filePath = path.join(uploadsDir, fileName);

      // Optional: delete old file if being replaced
      if (existingFiles[key]) {
        const oldPath = path.join(uploadsDir, existingFiles[key]);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      fs.renameSync(file.filepath, filePath);
      uploadedFiles[key] = fileName;
    }

    // Merge new and existing files
    const updatedFiles = { ...existingFiles, ...uploadedFiles };

    const record = {
      employeeId,
      hashedPassword,
      files: updatedFiles,
    };

    if (index !== -1) {
      existing[index] = record;
    } else {
      existing.push(record);
    }

    fs.writeFileSync(metadataFile, JSON.stringify(existing, null, 2));
    return res.status(200).json({ success: true });
  });
}
