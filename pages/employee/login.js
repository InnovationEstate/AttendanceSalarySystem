"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function EmployeeLogin() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const getLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject("Geolocation not supported");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          resolve({ latitude, longitude });
        },
        (err) => {
          console.error("Geolocation error:", err);
          reject("Location permission denied or unavailable");
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const { email, password } = form;
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    try {
      const coords = await getLocation();

      const addressRes = await fetch("/api/geo/reverse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coords),
      });
      const { address } = await addressRes.json();

      const res = await fetch("/api/employee/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          location: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            address,
          },
          device: navigator.userAgent,
        }),
      });

      const data = await res.json();
      console.log("Login response:", data);

      if (data.needPasswordSetup) {
        router.push(`/employee/set-password?email=${encodeURIComponent(data.email)}`);
        return;
      }

      if (!res.ok) throw new Error(data.error || "Login failed");

      // Save employee info in localStorage (do NOT save password here)
      localStorage.setItem(
        "employee",
        JSON.stringify({
          name: data.employee.name,
          email: data.employee.email,
          number: data.employee.number,
          password: password, // Only if you need it later
        })
      );
      localStorage.setItem("loginTime", new Date().toISOString());

      sessionStorage.setItem("isEmployeeLoggedIn", "true");
      router.push("/employee/attendance");
    } catch (err) {
      setError(err.message || "Login failed");
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 mt-10 border rounded shadow bg-white">
      <h2 className="text-2xl mb-6 text-center font-semibold">Employee Login</h2>
      {error && (
        <div className="mb-4 text-red-600 bg-red-100 p-2 rounded">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          name="email"
          placeholder="Email Address"
          value={form.email}
          onChange={handleChange}
          className="p-2 border rounded"
          required
        />
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            className="p-2 border rounded w-full"
            required
          />
          <span
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-600"
          >
            {showPassword ? <FiEyeOff /> : <FiEye />}
          </span>
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Login
        </button>
      </form>
    </div>
  );
}
