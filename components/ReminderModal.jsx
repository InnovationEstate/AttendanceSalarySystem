// components/ReminderModal.jsx
import { useState, useEffect } from "react";
import { ref, get } from "firebase/database";
import { db } from "../lib/firebase";

export default function ReminderModal({ employee }) {
  const [show, setShow] = useState(false);
  const [needsDocs, setNeedsDocs] = useState(false);
  const [needsBirthday, setNeedsBirthday] = useState(false);

  useEffect(() => {
    if (!employee?.id) return;

    let cancelled = false;

    (async () => {
      // ✅ Required document keys (kept in one place)
      const requiredDocs = ["aadhar", "pan", "bank", "photo"];

      // ✅ Documents live at: documents/{employeeId}/files
      const docsSnap = await get(ref(db, `documents/${employee.id}`));
      const docsNode = docsSnap.val();
      const files = docsNode?.files || {};

      // A doc is considered present only if it exists and has a storage path
      const docsMissing = requiredDocs.some(
        (key) => !files[key] || typeof files[key] !== "object" || !files[key].name
      );

      // ✅ Birthday lives at: birthdays/{employeeId}
      const bdaySnap = await get(ref(db, `birthdays/${employee.id}`));
      const birthdayMissing = !bdaySnap.exists() || !bdaySnap.val()?.birthday;

      if (cancelled) return;

      setNeedsDocs(docsMissing);
      setNeedsBirthday(birthdayMissing);
      setShow(docsMissing || birthdayMissing);
    })();

    return () => {
      cancelled = true;
    };
  }, [employee?.id]);

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
