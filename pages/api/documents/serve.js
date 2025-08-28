import bcrypt from "bcryptjs";
import { db, bucket } from "../../../lib/firebaseAdmin";

// export default async function handler(req, res) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method Not Allowed" });
//   }

//   const { employeeId, password, docKey, isAdmin } = req.body;

//   if (!employeeId || !docKey) {
//     return res.status(400).json({ error: "Missing employeeId or docKey" });
//   }

//   try {
//     const snapshot = await db.ref(`documents/${employeeId}`).once("value");
//     const employeeRecord = snapshot.val();

//     if (!employeeRecord) {
//       return res.status(404).json({ error: "Employee record not found" });
//     }

//     if (!isAdmin) {
//       if (!password) {
//         return res.status(400).json({ error: "Password required" });
//       }
//       const match = await bcrypt.compare(password, employeeRecord.hashedPassword);
//       if (!match) {
//         return res.status(401).json({ error: "Incorrect password" });
//       }
//     }

//     const fileData = employeeRecord.files?.[docKey];
//     if (!fileData || !fileData.name) {
//       return res.status(404).json({ error: "File not found or missing storage path" });
//     }

//     const storagePath = fileData.name;

//     const [url] = await bucket.file(storagePath).getSignedUrl({
//   action: "read",
//   expires: Date.now() + 60 * 60 * 1000,
// });


//     return res.status(200).json({ success: true, url });
//   } catch (error) {
//     console.error("❌ Error serving document:", error);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// }
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ error: "Method Not Allowed" });
    }

    const { employeeId, password, docKey, isAdmin } = req.body || {};

    if (!employeeId || !docKey) {
      return res
        .status(400)
        .json({ error: "Missing employeeId or docKey" });
    }

    const snapshot = await db.ref(`documents/${employeeId}`).once("value");
    const employeeRecord = snapshot.val();

    if (!employeeRecord) {
      return res
        .status(404)
        .json({ error: "Employee record not found" });
    }

    if (!isAdmin) {
      if (!password) {
        return res
          .status(400)
          .json({ error: "Password required" });
      }
      const match = await bcrypt.compare(
        password,
        employeeRecord.hashedPassword || ""
      );
      if (!match) {
        return res
          .status(401)
          .json({ error: "Incorrect password" });
      }
    }

    const fileData = employeeRecord.files?.[docKey];
    if (!fileData) {
      return res
        .status(404)
        .json({ error: "File not found" });
    }

    // Support both {name} and {storagePath}
    const storagePath = fileData.storagePath || fileData.name;
    if (!storagePath) {
      return res
        .status(400)
        .json({ error: "Missing storage path" });
    }

    const [url] = await bucket.file(storagePath).getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    return res.status(200).json({ success: true, url });
  } catch (error) {
    console.error("❌ Error serving document:", error);
    // <--- Always return JSON, never empty
    return res
      .status(500)
      .json({ error: error.message || "Internal Server Error" });
  }
}

