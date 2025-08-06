// pages/api/attendance/get.js
import { db } from "../../../lib/firebase";
import { ref, get } from "firebase/database";

export default async function handler(req, res) {
  try {
    const rootRef = ref(db, "attendance");
    const snapshot = await get(rootRef);

    if (!snapshot.exists()) {
      return res.status(200).json({ data: [] });
    }

    const data = snapshot.val(); // structure: { "2025-08-01": { id1: {...}, id2: {...} }, ... }

    const records = [];

    for (const date in data) {
      const dailyRecords = data[date];
      for (const id in dailyRecords) {
        records.push(dailyRecords[id]);
      }
    }

    return res.status(200).json({ data: records });
  } catch (err) {
    console.error("❌ Error fetching attendance:", err);
    return res.status(500).json({ error: "Failed to fetch attendance" });
  }
}
