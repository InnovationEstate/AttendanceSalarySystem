import { db } from "../../../lib/firebaseAdmin"; // make sure your Firebase Admin is initialized here

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { email, date, reason } = req.body;

    if (!email || !date || !reason) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Reference to leaveRequests node
    const leaveRef = db.ref("leaveRequests");

    // Fetch all leave requests for this email & date to check duplicates
    const snapshot = await leaveRef
      .orderByChild("email")
      .equalTo(email)
      .once("value");

    const requests = snapshot.val() || {};

    // Check if any leave request for the same date exists for this email
    const duplicate = Object.values(requests).some(
      (r) => r.date === date
    );

    if (duplicate) {
      return res.status(400).json({ message: "Already applied for this date." });
    }

    // Add new leave request
    const newLeaveRef = leaveRef.push();
    await newLeaveRef.set({
      id: newLeaveRef.key,
      email,
      date,
      reason,
      status: "pending",
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({ message: "Leave request submitted." });
  } catch (error) {
    console.error("Error submitting leave request:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
