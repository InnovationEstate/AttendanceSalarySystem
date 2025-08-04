import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "employees.json");

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    query: { id },
  } = req;

  const updatedData = req.body;

  try {
    const fileData = fs.readFileSync(filePath, "utf-8");
    const employees = JSON.parse(fileData);

    const index = employees.findIndex((emp) => emp.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Employee not found" });
    }

    employees[index] = { ...employees[index], ...updatedData };
    fs.writeFileSync(filePath, JSON.stringify(employees, null, 2));

    return res.status(200).json({ success: true, employee: employees[index] });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update employee" });
  }
}
