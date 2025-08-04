"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EmployeeLogin() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    number: "",
    password: "",
  });
  const [error, setError] = useState(null);
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

  const getAddressFromCoords = async ({ latitude, longitude }) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
      {
        headers: {
          "User-Agent":
            "attendance-salary-tracker/1.0 (innovationestate.in@gmail.com)",
        },
      }
    );
    const data = await response.json();
    return data.display_name || "Unknown location";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const { name, email, number, password } = form;
    if (!name || !email || !number || !password) {
      setError("All fields including password are required.");
      return;
    }

    try {
      const coords = await getLocation();
      const address = await getAddressFromCoords(coords);

      const res = await fetch("/api/employee/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          number,
          password, // ✅ include password in request
          location: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            address,
          },
          device: navigator.userAgent,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      localStorage.setItem("employee", JSON.stringify(data.employee));
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
          type="text"
          name="name"
          placeholder="Full Name"
          value={form.name}
          onChange={handleChange}
          className="p-2 border rounded"
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email Address"
          value={form.email}
          onChange={handleChange}
          className="p-2 border rounded"
          required
        />
        <input
          type="tel"
          name="number"
          placeholder="Phone Number"
          value={form.number}
          onChange={handleChange}
          className="p-2 border rounded"
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          className="p-2 border rounded"
          required
        />
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
