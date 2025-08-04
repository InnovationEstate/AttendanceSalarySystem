import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "employees.json");

export default function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    query: { id },
  } = req;

  try {
    const fileData = fs.readFileSync(filePath, "utf-8");
    let employees = JSON.parse(fileData);

    const index = employees.findIndex((emp) => emp.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Employee not found" });
    }

    employees.splice(index, 1); // remove employee
    fs.writeFileSync(filePath, JSON.stringify(employees, null, 2));

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete employee" });
  }
}
