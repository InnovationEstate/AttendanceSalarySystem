// components/ReminderModal.jsx
import { useState, useEffect } from "react";
import { ref, get } from "firebase/database";
import { db } from "../lib/firebase";

export default function ReminderModal() {
  const [show, setShow] = useState(false);
  const [needsDocs, setNeedsDocs] = useState(false);
  const [needsBirthday, setNeedsBirthday] = useState(false);

  useEffect(() => {
    // Get logged-in email from localStorage
    const email = typeof window !== "undefined" ? localStorage.getItem("email") : null;
    if (!email) return;

    let cancelled = false;

    (async () => {
      try {
        // 1️⃣ Fetch all employees
        const employeesSnap = await get(ref(db, "employees"));
        const employeesData = employeesSnap.val();
        if (!employeesData) return;

        // 2️⃣ Find the employee by email
        const empEntry = Object.entries(employeesData).find(
          ([id, emp]) => emp.email === email
        );
        if (!empEntry) return;

        const [employeeId] = empEntry;

        // 3️⃣ Check required documents
        const requiredDocs = ["aadhar", "pan", "bank", "photo"];
        const docsSnap = await get(ref(db, `documents/${employeeId}`));
        const files = docsSnap.val()?.files || {};
        const docsMissing = requiredDocs.some(
          (key) => !files[key] || typeof files[key] !== "object" || !files[key].name
        );

        // 4️⃣ Check birthday
        const bdaySnap = await get(ref(db, `birthdays/${employeeId}`));
        const birthdayMissing = !bdaySnap.exists() || !bdaySnap.val()?.birthday;

        if (cancelled) return;

        setNeedsDocs(docsMissing);
        setNeedsBirthday(birthdayMissing);
        setShow(docsMissing || birthdayMissing);
      } catch (err) {
        console.error("Error fetching reminder data:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-2xl shadow-lg w-[400px] text-center">
        <h2 className="text-xl font-bold mb-4">Complete Your Profile</h2>

        <p className="mb-4 text-gray-700">
          {needsDocs && "Please upload your required documents. "}
          {needsBirthday && "Please add your date of birth."}
        </p>

        <div className="flex flex-col gap-3">
          {needsDocs && (
            <button
              onClick={() => (window.location.href = "/employee/documents")}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Upload Documents
            </button>
          )}

          {needsBirthday && (
            <button
              onClick={() => (window.location.href = "/employee/profile")}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Add Birthday
            </button>
          )}

          <button
            onClick={() => setShow(false)}
            className="bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
