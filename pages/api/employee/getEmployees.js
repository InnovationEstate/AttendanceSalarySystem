// pages/api/employee/getEmployees.js
import fs from "fs";
import path from "path";

const employeesFile = path.join(process.cwd(), "data", "employees.json");

const readJSON = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return [];
  }
};

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const employees = readJSON(employeesFile);
  res.status(200).json(employees);
}
