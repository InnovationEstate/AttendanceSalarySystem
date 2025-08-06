"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import getAttendanceSummary from "../../utils/attendanceUtils";
import { UAParser } from "ua-parser-js";

export default function Dashboard() {
  const router = useRouter();

  const [summary, setSummary] = useState({
    present: 0,
    half: 0,
    leave: 0,
    unpaidLeaves: 0,
    weekOff: 0,
    totalDays: 0,
  });

  const [emp, setEmp] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchSummary = (email) => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const today = now.getDate();

    fetch("/api/attendance/get")
      .then((res) => res.json())
      .then((json) => {
        const result = getAttendanceSummary(
          json.data,
          month,
          year,
          today,
          true,
          email
        );
        setSummary(result);
      });
  };

  useEffect(() => {
    const storedEmp = JSON.parse(localStorage.getItem("employee"));
    if (!storedEmp?.email) return;
    setEmp(storedEmp);
    fetchSummary(storedEmp.email);
  }, []);

  const markAttendance = async (
    fetchSummary,
    setMessage,
    setLoading,
    router
  ) => {
    // Get employee from localStorage
    const emp = JSON.parse(localStorage.getItem("employee"));

    if (!emp) {
      setMessage("❌ Employee data not found. Please log in again.");
      return;
    }

    if (!emp.password) {
      setMessage("❌ Password missing. Please log in again.");
      return;
    }

    setLoading(true);
    setMessage("");

    // Step 1: Get device info using UAParser
    const parser = new UAParser();
    const result = parser.getResult();
    const deviceInfo = {
      type: result.device.type || "desktop",
      model: result.device.model || "Unknown",
      vendor: result.device.vendor || "Unknown",
      os: `${result.os.name || "Unknown"} ${result.os.version || ""}`.trim(),
      browser: `${result.browser.name || "Unknown"} ${result.browser.version || ""}`.trim(),
      screen: `${window.screen.width}x${window.screen.height}`,
      userAgent: navigator.userAgent,
    };

    // Step 2: Get geolocation coordinates
    const getLocation = () =>
      new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolocation not supported by this browser"));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords || {};
            if (latitude && longitude) {
              resolve({ latitude, longitude });
            } else {
              reject(new Error("Invalid coordinates received"));
            }
          },
          (err) => {
            console.error("Geolocation error:", err);
            reject(new Error("Location permission denied or unavailable"));
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      });

    // Step 3: Reverse geocode lat/lon to address string
    const getAddressFromCoords = async ({ latitude, longitude }) => {
      try {
        const response = await fetch("/api/geo/reverse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude, longitude }),
        });

        const data = await response.json();
        return data.address || "Unknown location";
      } catch (err) {
        console.error("Reverse geocoding failed:", err);
        return "Unknown location";
      }
    };

    try {
      const coords = await getLocation();
      const address = await getAddressFromCoords(coords);

      // Send login request with stored password
      const res = await fetch("/api/employee/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: emp.name,
          email: emp.email,
          number: emp.number,
          password: emp.password, // IMPORTANT: send password stored locally
          location: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            address,
          },
          device: deviceInfo,
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error("Failed to parse server response");
      }

      if (!res.ok) {
        setMessage(`❌ ${data.error || "Server error"}`);
      } else {
        setMessage("✅ Attendance marked successfully!");
        if (typeof fetchSummary === "function") {
          fetchSummary(emp.email);
        }
        setTimeout(() => {
          router.push("/employee/attendance");
        }, 1000);
      }
    } catch (err) {
      console.error("Attendance error:", err);
      setMessage(`❌ ${err.message || "Something went wrong."}`);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const totalDaysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();

  if (!emp) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-50 to-blue-100 p-4 md:p-8 text-sm md:text-base">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-4 sm:p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-800">
              Hello, {emp.name}
            </h1>
            <h2 className="text-sm sm:text-lg md:text-xl font-semibold text-gray-600">
              Welcome to your Dashboard
            </h2>
          </div>

          <button
            onClick={() =>
              markAttendance(fetchSummary, setMessage, setLoading, router)
            }
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition duration-300 disabled:opacity-50"
          >
            {loading ? "Marking Attendance..." : "Mark Attendance"}
          </button>
        </div>

        {/* ✅ Show Message */}
        {message && (
          <div
            className={`mb-4 p-3 rounded ${
              message.startsWith("✅")
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          <StatCard title="Total Days in Month" value={totalDaysInMonth} />
          <StatCard
            title="Total Present"
            value={summary.present + summary.half}
          />
          <StatCard title="Half Days" value={summary.half} />
          <StatCard title="Leaves" value={summary.leave} />
          <StatCard title="Week Offs" value={summary.weekOff} />
          <StatCard title="Unpaid Leaves" value={summary.unpaidLeaves} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 text-center shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-700">
        {value}
      </div>
      <div className="mt-1 sm:mt-2 text-sm sm:text-base md:text-lg text-blue-900 font-medium">
        {title}
      </div>
    </div>
  );
}
