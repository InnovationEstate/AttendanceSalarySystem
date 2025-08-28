import { initNotifications } from "./lib/notifications";

initNotifications()
  .then(() => console.log("Telegram notifications running ✅"))
  .catch((err) => console.error("Error starting notifications:", err));
