import admin from "firebase-admin";
import { getStorage } from "firebase-admin/storage"; // ✅ Correct import for Admin SDK

if (!admin.apps.length) {
  let serviceAccount = {};

  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const decoded = Buffer.from(
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
      "base64"
    ).toString("utf-8");
    serviceAccount = JSON.parse(decoded);
  } else {
    const path = require("path");
    const serviceAccountPath = path.resolve(
      process.cwd(),
      "firebase-service-account.json"
    );
    serviceAccount = require(serviceAccountPath);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://innovationatssystem-default-rtdb.firebaseio.com/",
    storageBucket: "innovationatssystem.appspot.com", // ✅ Add this
  });
}

// ✅ Firebase Realtime Database instance
export const db = admin.database();

// ✅ Firebase Storage bucket reference
export const bucket = admin.storage().bucket(); // 🔥 This is the correct way
