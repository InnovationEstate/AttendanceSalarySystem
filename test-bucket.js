import admin from "firebase-admin";

async function main() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 env var not found");
  }
  
  const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf-8");
  const serviceAccount = JSON.parse(decoded);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://innovationatssystem-default-rtdb.firebaseio.com",
    storageBucket: "innovationatssystem.appspot.com",
  });

  console.log("Default bucket name:", admin.storage().bucket().name);
}

main().catch(console.error);
