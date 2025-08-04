import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const metadataFile = path.join(process.cwd(), "data", "documents.json");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { employeeId, password, isAdmin } = req.body;

  if (!employeeId) {
    return res.status(400).json({ error: "Missing employeeId" });
  }

  if (!fs.existsSync(metadataFile)) {
    return res.status(404).json({ error: "No documents found" });
  }

  let metadata;
  try {
    const rawData = fs.readFileSync(metadataFile, "utf-8");
    metadata = JSON.parse(rawData);
  } catch (err) {
    console.error("Failed to parse documents.json:", err);
    return res.status(500).json({ error: "Failed to read documents data" });
  }

  const employeeRecord = metadata.find((e) => e.employeeId === employeeId);
  if (!employeeRecord) {
    return res.status(404).json({ error: "Employee record not found" });
  }

  // 🔓 Allow admin access without password
  if (!isAdmin) {
    if (!password) {
      return res.status(400).json({ error: "Missing password" });
    }

    const match = await bcrypt.compare(password, employeeRecord.hashedPassword);
    if (!match) {
      return res.status(401).json({ error: "Incorrect password" });
    }
  }

  return res.status(200).json({ files: employeeRecord.files || {} });
}

