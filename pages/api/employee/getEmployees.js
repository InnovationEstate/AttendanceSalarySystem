import { db } from "../../../lib/firebase";
import { ref, get } from "firebase/database";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed. Use GET."
    });
  }

  try {
    const snapshot = await get(ref(db, "employees"));

    if (!snapshot.exists()) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No employees found"
      });
    }

    // Your structure is array-like: { 0: {...}, 1: {...} } → convert to array
    const employeesArray = Object.values(snapshot.val());

    // Optional: Filter out deleted or inactive users if you ever add such a flag
    // const activeEmployees = employeesArray.filter(emp => !emp.deleted && emp.active !== false);

    return res.status(200).json({
      success: true,
      data: employeesArray
    });

  } catch (error) {
    console.error("❌ Error fetching employees:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch employees"
    });
  }
}
