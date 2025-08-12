"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  // Logout function clears storage and redirects
  const doLogout = () => {
    localStorage.removeItem("employee");
    localStorage.removeItem("role");
    localStorage.removeItem("loginTime");
    sessionStorage.removeItem("isEmployeeLoggedIn");
    router.push("/employee/login");
  };

  useEffect(() => {
    /*
    // Auto logout feature disabled — manual logout only

    const loginTimeStr = localStorage.getItem("loginTime");
    if (!loginTimeStr) {
      // No login time found, force logout
      doLogout();
      return;
    }

    const loginTime = new Date(loginTimeStr);
    const now = new Date();

    const eightPMToday = new Date();
    eightPMToday.setHours(20, 0, 0, 0);

    // Auto logout if past 8 PM and login was before 8 PM today
    if (now > eightPMToday && loginTime < eightPMToday) {
      doLogout();
      return;
    }

    // Set timer to auto logout at 8 PM if current time is before 8 PM
    if (now < eightPMToday) {
      const msUntil8PM = eightPMToday.getTime() - now.getTime();
      const timer = setTimeout(() => {
        doLogout();
      }, msUntil8PM);

      return () => clearTimeout(timer);
    }
    */
  }, []);

  return (
    <div className="max-w-md mx-auto p-6 mt-20 border rounded shadow bg-white text-center">
      <h2 className="text-2xl font-semibold mb-6">Employee Logout</h2>
      <button
        onClick={doLogout}
        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded"
      >
        Logout Now
      </button>
      <p className="mt-4 text-gray-600 text-sm">
        {/* You will be automatically logged out daily at 8 PM. */}
      </p>
    </div>
  );
}