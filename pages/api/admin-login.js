// pages/api/admin-login.js

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { password } = req.body;
  const correctPassword = process.env.ADMIN_PASSWORD; // Keep this NOT prefixed with NEXT_PUBLIC

  if (password === correctPassword) {
    return res.status(200).json({ success: true });
  } else {
    return res.status(401).json({ success: false, message: "Incorrect password" });
  }
}
