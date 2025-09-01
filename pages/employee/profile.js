// pages/employee/profile.jsx
import { useState, useEffect } from "react";
import { ref, get, set } from "firebase/database";
import { db } from "../../lib/firebase";
import { toast, ToastContainer } from "react-toastify";
import { useRouter } from "next/router";
import "react-toastify/dist/ReactToastify.css";

export default function EmployeeProfile() {
  const [employee, setEmployee] = useState(null);
  const [employeeId, setEmployeeId] = useState(null);
  const [birthday, setBirthday] = useState("");
  const [documents, setDocuments] = useState(null);
  const router = useRouter();

  // Logged-in email from localStorage
  const email = typeof window !== "undefined" ? localStorage.getItem("email") : null;

  useEffect(() => {
    if (!email) return;

    let cancelled = false;

    const fetchEmployee = async () => {
      try {
        // 1️⃣ Fetch all employees and find the one with matching email
        const snap = await get(ref(db, "employees"));
        const employeesData = snap.val();
        if (!employeesData) return;

        const empEntry = Object.entries(employeesData).find(
          ([id, emp]) => emp.email === email
        );
        if (!empEntry) return;

        const [id, emp] = empEntry;
        if (cancelled) return;

        setEmployee(emp);
        setEmployeeId(id);

        // 2️⃣ Fetch birthday
        const birthdaySnap = await get(ref(db, `birthdays/${id}`));
        if (birthdaySnap.exists()) {
          setBirthday(birthdaySnap.val()?.birthday || "");
        }

        // 3️⃣ Fetch documents
        const docSnap = await get(ref(db, `documents/${id}`));
        if (docSnap.exists()) {
          setDocuments(docSnap.val()?.files || null);
        }
      } catch (error) {
        console.error("Error fetching employee profile:", error);
        toast.error("Failed to load profile.");
      }
    };

    fetchEmployee();

    return () => {
      cancelled = true;
    };
  }, [email]);

  const handleSave = async () => {
    if (!birthday) {
      toast.error("Please select a valid date.");
      return;
    }

    if (!employeeId) {
      toast.error("Employee not found.");
      return;
    }

    try {
      // Save birthday in database
      await set(ref(db, `birthdays/${employeeId}`), {
        employeeId,
        birthday,
      });

      toast.success("Birthday updated successfully!");

      // Redirect to employee dashboard after 1 second
      setTimeout(() => {
        router.push("/employee/dashboard");
      }, 1000);
    } catch (error) {
      console.error("Error saving birthday:", error);
      toast.error("Failed to update birthday.");
    }
  };

  if (!email) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">No employee logged in.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-md mx-auto bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Employee Profile</h2>

      {employee && (
        <div className="mb-4">
          <p className="font-medium">Name: {employee.name}</p>
          <p className="font-medium">Email: {employee.email}</p>
        </div>
      )}

      {/* Birthday */}
      <div className="mb-4">
        <label className="block mb-2 font-medium">Date of Birth</label>
        <input
          type="date"
          value={birthday}
          onChange={(e) => setBirthday(e.target.value)}
          className="w-full p-2 border rounded-lg"
        />
      </div>

      {/* Documents Section */}
      {documents && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Documents</h3>
          <ul className="list-disc list-inside space-y-1">
            {Object.entries(documents).map(([key, value]) => (
              <li key={key}>
                <span className="font-medium capitalize">{key}:</span>{" "}
                {value ? (
                  <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    View
                  </a>
                ) : (
                  <span className="text-gray-500">Not uploaded</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={handleSave}
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
      >
        Save
      </button>

      <ToastContainer position="top-right" autoClose={2000} />
    </div>
  );
}
