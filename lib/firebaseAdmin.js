
import path from "path";

import admin from "firebase-admin";

if (!admin.apps.length) {
  let serviceAccount = {};

  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf-8");
    serviceAccount = JSON.parse(decoded);
  } else {
    // fallback for local
    const path = require("path");
    const serviceAccountPath = path.resolve(process.cwd(), "firebase-service-account.json");
    serviceAccount = require(serviceAccountPath);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://innovationatssystem-default-rtdb.firebaseio.com/",
  });
}

export const db = admin.database();
