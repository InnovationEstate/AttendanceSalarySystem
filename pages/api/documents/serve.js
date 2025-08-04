import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const metadataFile = path.join(process.cwd(), "data", "documents.json");
const uploadsDir = path.join(process.cwd(), "uploads-private");

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { employeeId, password, docKey, isAdmin } = req.body;

  if (!employeeId || !docKey) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  if (!fs.existsSync(metadataFile)) {
    return res.status(404).json({ error: "Document metadata not found" });
  }

  const metadata = JSON.parse(fs.readFileSync(metadataFile, "utf-8"));
  const employeeRecord = metadata.find((e) => e.employeeId === employeeId);

  if (!employeeRecord) {
    return res.status(404).json({ error: "Employee not found" });
  }

  // 🔐 Only validate password if not admin
  if (!isAdmin) {
    if (!password) return res.status(400).json({ error: "Password required" });

    const match = await bcrypt.compare(password, employeeRecord.hashedPassword);
    if (!match) return res.status(401).json({ error: "Unauthorized" });
  }

  const filename = employeeRecord.files?.[docKey];
  if (!filename) {
    return res.status(404).json({ error: "Document not found" });
  }

  const filePath = path.join(uploadsDir, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found on server" });
  }

  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
  };

  res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
}
