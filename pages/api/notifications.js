import { initNotifications } from "../../lib/notifications";

export default function handler(req, res) {
  // Only initialize once
  if (!global.notificationsInitialized) {
    initNotifications();
    global.notificationsInitialized = true;
    console.log("Telegram notifications initialized ✅");
  }

  res.status(200).json({ ok: true });
}
