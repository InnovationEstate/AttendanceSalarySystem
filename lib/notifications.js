import { getDatabase, ref, onChildAdded, onChildChanged, get } from "firebase/database";
import { app } from "./firebase";
import { sendTelegramMessage } from "@/utils/telegram";
import cron from "node-cron";

const db = getDatabase(app);

export const initNotifications = async () => {
  console.log("Initializing notifications...");

  // =========================
  // ✅ Fetch all employees once
  // =========================
  const employeesSnapshot = await get(ref(db, "employees"));
  let employeesData = employeesSnapshot.val() || {};

  // Convert object to array if it's an object
  if (!Array.isArray(employeesData)) {
    employeesData = Object.values(employeesData);
  }

  console.log("Employees fetched from DB:", employeesData);

  // Helper function: get employee by email
  const getEmployeeByEmail = (email) => {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();

    const emp = employeesData.find(
      (e) => e.email?.trim().toLowerCase() === cleanEmail
    );

    if (!emp) {
      console.warn(`Employee not found for email: "${email}"`);
    } else {
      console.log(`Matched employee: "${emp.name}" for email: "${email}"`);
    }

    return emp || null;
  };

  // =========================
  // ✅ Leave request notifications
  // =========================
  const leaveRef = ref(db, "leaveRequests");

  onChildAdded(leaveRef, (snapshot) => {
    const leave = snapshot.val();
    console.log("New leave snapshot:", leave);

    // ✅ FIXED: use leave.email
    const emp = getEmployeeByEmail(leave.email);

    const message = `📝 New Leave Request:
Employee: ${emp?.name || "N/A"}
Employee ID: ${emp?.id || "N/A"}
Email: ${emp?.email || leave.email}
Date: ${leave.date}
Type: ${leave.type || "N/A"}
Reason: ${leave.reason}
Status: ${leave.status}`;

    console.log("Leave message:", message);
    sendTelegramMessage(message);
  });

  onChildChanged(leaveRef, (snapshot) => {
    const leave = snapshot.val();
    console.log("Updated leave snapshot:", leave);

    const emp = getEmployeeByEmail(leave.email);

    const message = `✏️ Leave Request Updated:
Employee: ${emp?.name || "N/A"}
Employee ID: ${emp?.id || "N/A"}
Email: ${emp?.email || leave.email}
Date: ${leave.date}
Type: ${leave.type || "N/A"}
Reason: ${leave.reason}
Status: ${leave.status}`;

    console.log("Leave update message:", message);
    sendTelegramMessage(message);
  });

  // =========================
  // ✅ Login notifications
  // =========================
  const loginRef = ref(db, "attendance");
  onChildAdded(loginRef, (snapshot) => {
    const date = snapshot.key;
    const employeesLogged = snapshot.val() || {};

    Object.entries(employeesLogged).forEach(([empKey, data]) => {
      const emp = getEmployeeByEmail(data.email);

      const locationAddress =
      typeof data.location === "string"
        ? data.location
        : data.location?.address || "N/A";

      const message = `✅ Employee Login:
Employee: ${emp?.name || "N/A"}
Employee ID: ${emp?.id || "N/A"}
Email: ${emp?.email || data.email || empKey}
Date: ${data.date || date}
Time: ${data.istLoginTime || "N/A"}
Location: ${locationAddress}
Device: ${data.device || "N/A"}`;

      console.log("Login message:", message);
      sendTelegramMessage(message);
    });
  });

  // =========================
  // ✅ Birthday notifications (daily at 9 AM)
  // =========================
  cron.schedule("0 9 * * *", async () => {
    try {
      const birthdaysSnapshot = await get(ref(db, "birthdays"));
      const birthdays = birthdaysSnapshot.val() || {};

      const today = new Date();
      const todayDay = today.getDate();
      const todayMonth = today.getMonth(); // 0-11

      Object.entries(birthdays).forEach(([empKey, data]) => {
        if (!data.birthday) return;

        const dob = new Date(data.birthday);
        if (dob.getDate() === todayDay && dob.getMonth() === todayMonth) {
          const emp = getEmployeeByEmail(data.email || empKey);

          const message = `🎉 Happy Birthday!
Employee: ${emp?.name || "N/A"}
Employee ID: ${emp?.id || "N/A"}
Email: ${emp?.email || empKey} 🎂`;

          console.log("Birthday message:", message);
          sendTelegramMessage(message);
        }
      });
    } catch (err) {
      console.error("Birthday check error:", err.message);
    }
  });

  // =========================
  // ✅ Week off changes
  // =========================
  const weekOffRef = ref(db, "weekOff");
  onChildAdded(weekOffRef, (snapshot) => {
    const day = snapshot.val();

    employeesData.forEach((emp) => {
      const message = `📅 Week Off Changed:
Employee: ${emp.name}
Employee ID: ${emp.id}
Email: ${emp.email}
New Week Off: ${day}`;

      console.log("Week Off message:", message);
      sendTelegramMessage(message);
    });
  });

  console.log("Notification listeners initialized ✅");
};
