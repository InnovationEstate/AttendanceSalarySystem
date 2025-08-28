"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue, update, get } from "firebase/database";

export default function ManageLeaves() {
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    // Fetch leave requests from Firebase
    const leaveRef = ref(db, "leaveRequests");
    onValue(leaveRef, (snapshot) => {
      const data = snapshot.val() || {};
      const formatted = Object.entries(data).map(([id, value]) => ({ id, ...value }));
      setRequests(formatted);
    });

    // Fetch employees from Firebase
    const empRef = ref(db, "employees");
    onValue(empRef, (snapshot) => {
      const data = snapshot.val() || {};
      const formatted = Object.entries(data).map(([id, value]) => ({ id, ...value }));
      setEmployees(formatted);
    });
  }, []);

  const handleUpdate = async (id, status) => {
    const requestRef = ref(db, `leaveRequests/${id}`);
    await update(requestRef, { status });

    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
  };

  const getEmployeeInfo = (email) => {
    const emp = employees.find((e) => e.email === email);
    if (!emp) return { id: "Unknown", name: "Unknown" };
    return { id: emp.id || "Unknown", name: emp.name || "Unknown" };
  };

  return (
  <div className="p-6 max-w-3xl mx-auto">
    <h2 className="text-2xl font-bold mb-4"> Leave Requests</h2>

    {requests.length === 0 ? (
      <p className="text-gray-500 italic">No Leave Requests</p>
    ) : (
      requests.map((req) => {
        const { id, name } = getEmployeeInfo(req.email);
        return (
          <div key={req.id} className="border p-4 rounded mb-4">
            <p>
              <strong>
                {id} - {name}
              </strong>{" "}
              applied for leave on <strong>{req.date}</strong>
            </p>
            <p className="text-sm italic mb-2">{req.reason}</p>
            {req.status === "pending" ? (
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdate(req.id, "approved")}
                  className="bg-green-600 text-white px-3 py-1 rounded"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleUpdate(req.id, "rejected")}
                  className="bg-red-600 text-white px-3 py-1 rounded"
                >
                  Reject
                </button>
              </div>
            ) : (
              <p>
                Status: <strong className="capitalize">{req.status}</strong>
              </p>
            )}
          </div>
        );
      })
    )}
  </div>
);

}
