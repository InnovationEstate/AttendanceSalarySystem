import { db } from "../../../lib/firebaseAdmin";
import { ref, get, remove } from "firebase/database";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "Missing leave request id" });
  }

  try {
    // Get all leave requests
    const leaveSnap = await get(ref(db, "leaveRequests"));
    const leaveData = leaveSnap.val() || {};

    // Find the key for the leave request with this id
    const leaveKey = Object.keys(leaveData).find(key => leaveData[key].id === id);

    if (!leaveKey) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    const leaveRequest = leaveData[leaveKey];

    // Only allow cancellation if status is pending
    if (leaveRequest.status !== "pending") {
      return res.status(400).json({ message: "Only pending leave requests can be cancelled" });
    }

    // Remove the leave request
    await remove(ref(db, `leaveRequests/${leaveKey}`));

    return res.status(200).json({ message: "Leave request cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling leave request:", error);
    return res.status(500).json({ message: "Failed to cancel leave request" });
  }
}
