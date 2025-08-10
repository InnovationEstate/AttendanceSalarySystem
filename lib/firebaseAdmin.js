import admin from "firebase-admin";
import path from "path";

if (!admin.apps.length) {
  let serviceAccount = {};

  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const decoded = Buffer.from(
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
      "base64"
    ).toString("utf-8");
    serviceAccount = JSON.parse(decoded);
  } else {
    const serviceAccountPath = path.resolve(process.cwd(), "firebase-service-account.json");
    serviceAccount = require(serviceAccountPath);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://innovationatssystem-default-rtdb.firebaseio.com/",
    storageBucket: "innovationatssystem.firebasestorage.app", // ✅ Correct bucket
  });
}

export const db = admin.database();
export const bucket = admin.storage().bucket(); // ✅ No need to re-pass name
