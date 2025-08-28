import axios from "axios";

const TELEGRAM_BOT_TOKEN = "8110652276:AAFMQdUtrZJAU8dI7RgqgGsaSWCtD4YT44o"; // from BotFather
const CHAT_ID = "8452088797"; // from getUpdates

export const sendTelegramMessage = async (message) => {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await axios.post(url, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: "HTML",
    });
  } catch (err) {
    console.error("Telegram error:", err.message);
  }
};
