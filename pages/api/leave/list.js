import { db } from "../../../lib/firebaseAdmin"; // your initialized Firebase Admin SDK

export default async function handler(req, res) {
  try {
    const snapshot = await db.ref("leaveRequests").once("value");
    const leaveRequests = snapshot.val() || {};
    // Convert object to array
    const leaveList = Object.values(leaveRequests);
    res.status(200).json(leaveList);
  } catch (error) {
    console.error("Error fetching leave requests:", error);
    res.status(500).json({ error: "Failed to fetch leave requests" });
  }
}
