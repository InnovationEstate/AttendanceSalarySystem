"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, get } from "firebase/database";

export default function PreviousEmployees() {
  const [previousEmployees, setPreviousEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPreviousEmployees();
  }, []);

  async function fetchPreviousEmployees() {
    try {
      const snapshot = await get(ref(db, "pastEmps"));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([key, value]) => ({
          firebaseKey: key,
          ...value,
        }));
        setPreviousEmployees(list);
      } else {
        setPreviousEmployees([]);
      }
    } catch (err) {
      console.error("Error fetching previous employees:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-4 sm:p-6 bg-gray-50 min-h-screen text-sm sm:text-base">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-lg sm:text-2xl font-bold">
          Previous Employees: {previousEmployees.length}
        </h1>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow rounded text-sm sm:text-base">
          <thead>
            <tr className="bg-blue-200">
              <th className="p-3 text-left">ID</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Number</th>
              <th className="p-3 text-left">Designation</th>
              <th className="p-3 text-left">Salary</th>
              <th className="p-3 text-left">Joining Date</th>
              <th className="p-3 text-left">Deleted At</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="p-4 text-center">
                  Loading...
                </td>
              </tr>
            ) : previousEmployees.length > 0 ? (
              previousEmployees.map((emp) => (
                <tr
                  key={emp.firebaseKey}
                  className="border-t hover:bg-gray-50 transition"
                >
                  <td className="p-3">{emp.id}</td>
                  <td className="p-3">{emp.name}</td>
                  <td className="p-3">{emp.email}</td>
                  <td className="p-3">{emp.number}</td>
                  <td className="p-3">{emp.designation}</td>
                  <td className="p-3">
                    {emp.salary && typeof emp.salary === "object"
                      ? emp.salary[
                          Object.keys(emp.salary).sort().slice(-1)[0]
                        ]
                      : emp.salary}
                  </td>
                  <td className="p-3">{emp.joiningDate}</td>
                  <td className="p-3">
                    {emp.deletedAt
                      ? new Date(emp.deletedAt).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="p-4 text-center text-gray-500">
                  No previous employees found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

// this is the code which is to be replaced in admin/employee.js page in place of delete functionality

// async function handleDeleteConfirm() {
//   if (!employeeToDelete) return;

//   try {
//     // 1. Save employee data into "pastEmps"
//     await set(ref(db, `pastEmps/${employeeToDelete.firebaseKey}`), {
//       ...employeeToDelete,
//       deletedAt: new Date().toISOString(), // optional: track when deleted
//     });

//     // 2. Remove from "employees"
//     await remove(ref(db, `employees/${employeeToDelete.firebaseKey}`));

//     // 3. Cleanup state
//     setShowDeleteModal(false);
//     setEmployeeToDelete(null);
//     fetchEmployees();
//   } catch (err) {
//     console.error("Error moving employee to pastEmps:", err);
//   }
// }
