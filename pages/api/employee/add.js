import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "employees.json");

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const newEmployee = req.body;

  try {
    // Read existing employee data
    const fileData = fs.readFileSync(filePath, "utf-8");
    const employees = JSON.parse(fileData);

    // Check if employee with same email already exists
    const exists = employees.find((emp) => emp.email === newEmployee.email);
    if (exists) {
      return res.status(400).json({ error: "Employee already exists" });
    }

    // Generate a unique employee ID: IE + year(25) + 3-digit serial number
    const companyCode = "IE";
    const year = new Date().getFullYear().toString().slice(-2); // "25" for 2025

    // Filter existing employee IDs that start with IE + current year
    const currentIds = employees
      .map((emp) => emp.id)
      .filter((id) => id?.startsWith(`${companyCode}${year}`));

    // Extract max 3-digit number
    let maxNum = 0;
    currentIds.forEach((id) => {
      const num = parseInt(id.slice(-3)); // last 3 digits
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    });

    // Next serial number
    const nextNumber = (maxNum + 1).toString().padStart(3, "0"); // e.g., "013"
    const newId = `${companyCode}${year}${nextNumber}`; // e.g., "IE25013"

    // Add ID and joining date
    newEmployee.id = newId;
    newEmployee.joiningDate = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

    // Push and save
    employees.push(newEmployee);
    fs.writeFileSync(filePath, JSON.stringify(employees, null, 2));

    res.status(201).json({ success: true, employee: newEmployee });
  } catch (error) {
    console.error("Failed to add employee:", error);
    res.status(500).json({ error: "Failed to add employee" });
  }
}
