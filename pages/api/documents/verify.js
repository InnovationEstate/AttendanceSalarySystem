import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const metadataFile = path.join(process.cwd(), "data", "documents.json");
const dummyHash = "$2a$10$zV9M9pN8rNd9xGgmZP/jMezW/MkgV4EfZ5t06EKc6Eq19VJhvEi32"; // bcrypt hash of "dummy"

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  const { employeeId, password } = req.body;

  console.log("Received verify request:", { employeeId, password });

  if (
    !employeeId ||
    typeof employeeId !== "string" ||
    !password ||
    typeof password !== "string"
  ) {
    return res.status(400).json({ error: "Missing or invalid employeeId or password" });
  }

  if (!fs.existsSync(metadataFile)) {
    return res.status(404).json({
      error:
        "No documents data found. Employee database is empty. Please create your password first.",
    });
  }

  let metadata;
  try {
    metadata = JSON.parse(fs.readFileSync(metadataFile, "utf-8"));
  } catch (err) {
    return res.status(500).json({ error: "Failed to read documents data" });
  }

  if (!Array.isArray(metadata) || metadata.length === 0) {
    return res.status(404).json({
      error:
        "Employee database is empty. Please create your password first.",
    });
  }

  const employeeRecord = metadata.find(
    (e) => e.employeeId.trim() === employeeId.trim()
  );

  if (!employeeRecord) {
    await bcrypt.compare(password, dummyHash);
    return res.status(404).json({
      error:
        "Employee not registered yet. Please create your password first.",
    });
  }

  const match = await bcrypt.compare(password, employeeRecord.hashedPassword);

  if (!match) {
    return res.status(401).json({ error: "Incorrect password" });
  }

  return res.status(200).json({ success: true, files: employeeRecord.files || [] });
}
