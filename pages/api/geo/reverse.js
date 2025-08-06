// pages/api/geo/reverse.js
import fetch from "node-fetch";
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: "Missing coordinates" });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "attendance-salary-tracker/1.0 (innovationestate.in@gmail.com)",
      },
    });

    const data = await response.json();

    return res.status(200).json({ address: data.display_name || "Unknown location" });
  } catch (err) {
    console.error("🌐 Reverse geocoding failed:", err);
    return res.status(500).json({ error: "Failed to fetch location" });
  }
}
