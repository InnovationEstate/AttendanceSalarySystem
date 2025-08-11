"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SetPassword() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || ""; // get email from query param

  useEffect(() => {
    if (!email) {
      setMessage("❌ Email not found in URL. Please use the correct link.");
    }
  }, [email]);

  const validatePassword = (pwd) => {
    const regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&])[A-Za-z\d@$!%*?#&]{8,}$/;
    return regex.test(pwd);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!email) {
      setMessage("❌ Missing email, cannot set password.");
      return;
    }

    if (!password) {
      setMessage("❌ Please enter a password.");
      return;
    }

    if (!validatePassword(password)) {
      setMessage(
        "❌ Password must be 8+ chars, with uppercase, lowercase, number & special char."
      );
      return;
    }

    try {
      const res = await fetch("/api/employee/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(`❌ ${data.error}`);
        return;
      }

      setMessage("✅ Password set successfully! Redirecting to login...");
      setTimeout(() => router.push("/employee/login"), 2000);
    } catch (err) {
      setMessage("❌ Something went wrong. Please try again.");
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 mt-10 border rounded shadow bg-white">
      <h2 className="text-2xl mb-4 font-bold text-center">Set Your Password</h2>

      {message && (
        <p className={`mb-4 text-sm text-center ${message.startsWith("❌") ? "text-red-600" : "text-green-600"}`}>
          {message}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="p-2 border rounded"
          required
          autoFocus
        />
        <button
          type="submit"
          className="bg-green-600 hover:bg-green-700 text-white py-2 rounded"
        >
          Set Password
        </button>
      </form>
    </div>
  );
}
