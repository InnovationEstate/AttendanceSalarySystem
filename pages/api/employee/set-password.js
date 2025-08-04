import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";

const employeesFile = path.join(process.cwd(), "data", "employees.json");

const readJSON = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    console.error("❌ Failed to read JSON:", err);
    return [];
  }
};

const writeJSON = (file, data) => {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❌ Failed to write JSON:", err);
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password" });
  }

  try {
    const employees = readJSON(employeesFile);

    const index = employees.findIndex(
      (e) => e.email.toLowerCase().trim() === email.toLowerCase().trim()
    );

    if (index === -1) {
      return res.status(404).json({ error: "Employee not found" });
    }

    if (employees[index].password) {
      return res
        .status(400)
        .json({ error: "Password already set for this employee" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    employees[index].password = hashedPassword;

    writeJSON(employeesFile, employees);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Error in set-password API:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
