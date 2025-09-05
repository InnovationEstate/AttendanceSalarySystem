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
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 1️⃣ Load email from localStorage and fetch full employee data from Firebase
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedEmp = JSON.parse(localStorage.getItem("employee"));
    if (!storedEmp?.email) {
      setLoading(false);
      return;
    }

    const fetchEmployee = async () => {
      try {
        const employeesSnap = await get(ref(db, "employees"));
        const employeesData = employeesSnap.val();
        if (!employeesData) {
          setLoading(false);
          return;
        }

        // Find employee by email
        const empEntry = Object.entries(employeesData).find(
          ([id, emp]) => emp.email === storedEmp.email
        );
        if (!empEntry) {
          setLoading(false);
          return;
        }

        const [id, emp] = empEntry;
        setEmployee(emp);
        setEmployeeId(id);

        // Fetch birthday
        const birthdaySnap = await get(ref(db, `birthdays/${id}`));
        if (birthdaySnap.exists())
          setBirthday(birthdaySnap.val()?.birthday || "");

        // Fetch documents
        const docSnap = await get(ref(db, `documents/${id}`));
        if (docSnap.exists()) setDocuments(docSnap.val()?.files || null);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching employee profile:", error);
        toast.error("Failed to load profile.");
        setLoading(false);
      }
    };

    fetchEmployee();
  }, []);

  // 2️⃣ Save birthday
  const handleSave = async () => {
    if (!birthday) return toast.error("Please select a valid date.");
    if (!employeeId) return toast.error("Employee not found.");

    try {
      await set(ref(db, `birthdays/${employeeId}`), { employeeId, birthday });
      toast.success("Birthday updated successfully!");
      setTimeout(() => router.push("/employee/dashboard"), 1000);
    } catch (error) {
      console.error("Error saving birthday:", error);
      toast.error("Failed to update birthday.");
    }
  };

  // 3️⃣ Conditional rendering
  if (loading) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">No employee logged in.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-md mx-auto bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Employee Profile</h2>

      {/* All Employee Details */}
      <div className="mb-4 space-y-1">
        <p>
          <span className="font-medium">Name:</span> {employee.name}
        </p>
        <p>
          <span className="font-medium">Email:</span> {employee.email}
        </p>
        <p>
          <span className="font-medium">Number:</span> {employee.number}
        </p>
        <p>
          <span className="font-medium">Employee ID:</span> {employee.id}
        </p>
        <p>
          <span className="font-medium">Designation:</span>{" "}
          {employee.designation}
        </p>
        <p>
          <span className="font-medium">Salary:</span> {employee.salary}
        </p>
        <p>
          <span className="font-medium">Joining Date:</span>{" "}
          {employee.joiningDate}
        </p>
      </div>
      {/* Birthday */}
      <div className="mb-4">
        <label className="block mb-2 font-medium">Date of Birth</label>

        {birthday ? (
          <p className="w-full p-2 border rounded-lg bg-gray-100">
            Birthday : {new Date(birthday).toLocaleDateString("en-GB")}
          </p>
        ) : (
          <input
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            className="w-full p-2 border rounded-lg"
          />
        )}
      </div>

      {/* Documents */}
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
