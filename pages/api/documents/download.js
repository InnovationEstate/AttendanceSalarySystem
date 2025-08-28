// pages/api/documents/download.js
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { getDatabase, ref as dbRef, get } from "firebase/database";
import { app } from "../../../lib/firebase";
import axios from "axios";

export default async function handler(req, res) {
  try {
    const { employeeId, docKey } = req.query;

    if (!employeeId || !docKey) {
      return res.status(400).json({ error: "Missing employeeId or docKey" });
    }

    // ✅ Fetch file path from Firebase Realtime Database
    const db = getDatabase(app);
    const snapshot = await get(dbRef(db, `documents/${employeeId}/files/${docKey}`));

    if (!snapshot.exists()) {
      return res.status(404).json({ error: "File metadata not found" });
    }

    const fileMeta = snapshot.val(); // { name: "documents/IE25006/aadhar_1754827263221.pdf", originalName: "IE25006_aadhar.pdf" }

    if (!fileMeta.name) {
      return res.status(404).json({ error: "File path missing in database" });
    }

    // ✅ Use exact file path stored in DB
    const storage = getStorage(app);
    const fileRef = ref(storage, fileMeta.name);

    // ✅ Get signed download URL
    const fileUrl = await getDownloadURL(fileRef);

    // ✅ Fetch file as a stream
    const response = await axios.get(fileUrl, { responseType: "stream" });

    // ✅ Set headers for proper download
    res.setHeader("Content-Type", response.headers["content-type"] || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileMeta.originalName || docKey}"`
    );

    // ✅ Pipe file stream
    response.data.pipe(res);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ error: "Failed to download file" });
  }
}
