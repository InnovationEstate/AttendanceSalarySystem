// scripts/migrateToFirebase.js
import fs from "fs";
import path from "path";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set } from "firebase/database";
import dotenv from "dotenv"
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Utility to load JSON file
const loadJSON = (filename) => {
  const filePath = path.join(process.cwd(), "data", filename);
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
};

// Migration function
async function migrate() {
  // 1. Migrate employees.json
  const employees = loadJSON("employees.json");
  await set(ref(db, "employees"), employees);
  console.log("Migrated employees.json");

  // 2. Migrate documents.json
  const documents = loadJSON("documents.json");
  await set(ref(db, "documents"), documents);
  console.log("Migrated documents.json");

  // 3. Migrate attendance.json grouped by date
  const attendance = loadJSON("attendance.json");
  const attendanceByDate = {};
  attendance.forEach((entry) => {
    const date = entry.date;
    if (!attendanceByDate[date]) attendanceByDate[date] = {};
    // Use email as key, replace '.' as firebase keys cannot have dots
    const key = entry.email.replace(/\./g, "_");
    attendanceByDate[date][key] = entry;
  });
  for (const date in attendanceByDate) {
    await set(ref(db, `attendance/${date}`), attendanceByDate[date]);
    console.log(`Migrated attendance for date: ${date}`);
  }

  // 4. Migrate leaveRequests.json grouped by employee email
  const leaveRequests = loadJSON("leaveRequests.json");
  const leaveByEmployee = {};
  leaveRequests.forEach((entry) => {
    const key = entry.email.replace(/\./g, "_");
    if (!leaveByEmployee[key]) leaveByEmployee[key] = [];
    leaveByEmployee[key].push(entry);
  });
  await set(ref(db, "leaveRequests"), leaveByEmployee);
  console.log("Migrated leaveRequests.json");

  console.log("✅ All data migrated to Firebase!");
}

migrate().catch((err) => {
  console.error("Migration error:", err);
});
