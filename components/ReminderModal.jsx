import { useState, useEffect } from "react";
import { ref, get } from "firebase/database";
import { db } from "../lib/firebase";

export default function ReminderModal() {
  const [show, setShow] = useState(false);
  const [needsDocs, setNeedsDocs] = useState(false);
  const [needsBirthday, setNeedsBirthday] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [employeeId, setEmployeeId] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1️⃣ Load employee object from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedEmp = JSON.parse(localStorage.getItem("employee"));
    if (storedEmp) {
      setEmployee(storedEmp);
    }
    setLoading(false);
  }, []);

  // 2️⃣ Fetch employeeId and reminder info from Firebase
  useEffect(() => {
    if (!employee || loading) return;

    let cancelled = false;

    const fetchReminder = async () => {
      try {
        // Fetch all employees to find the employeeId using email
        const employeesSnap = await get(ref(db, "employees"));
        const employeesData = employeesSnap.val();
        if (!employeesData) return;

        const empEntry = Object.entries(employeesData).find(
          ([id, emp]) => emp.email === employee.email
        );
        if (!empEntry) return;

        const [id] = empEntry;
        setEmployeeId(id);

        // Check required documents
        const requiredDocs = ["aadharfront", "aadharback", "pan", "bank", "photo"];
        const docsSnap = await get(ref(db, `documents/${id}`));
        const files = docsSnap.val()?.files || {};
        const docsMissing = requiredDocs.some(
          (key) => !files[key] || typeof files[key] !== "object" || !files[key].name
        );

        // Check birthday
        const bdaySnap = await get(ref(db, `birthdays/${id}`));
        const birthdayMissing = !bdaySnap.exists() || !bdaySnap.val()?.birthday;

        if (cancelled) return;

        setNeedsDocs(docsMissing);
        setNeedsBirthday(birthdayMissing);
        setShow(docsMissing || birthdayMissing);
      } catch (err) {
        console.error("Error fetching reminder data:", err);
      }
    };

    fetchReminder();

    return () => {
      cancelled = true;
    };
  }, [employee, loading]);

  if (loading || !show) return null;

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
