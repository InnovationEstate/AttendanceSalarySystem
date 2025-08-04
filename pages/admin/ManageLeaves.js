"use client";
import { useEffect, useState } from "react";

export default function ManageLeaves() {
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    // Fetch leave requests
    fetch("/api/leave/list")
      .then(res => res.json())
      .then(data => setRequests(data));

    // Fetch employee list
    fetch("/api/employee/getEmployees")
      .then(res => res.json())
      .then(data => setEmployees(data));
  }, []);

  const handleUpdate = async (id, status) => {
    await fetch("/api/leave/update", {
      method: "POST",
      body: JSON.stringify({ id, status }),
    });

    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
  };

  // Utility to find employee info by email
  const getEmployeeInfo = (email) => {
    const emp = employees.find((e) => e.email === email);
    if (!emp) return { id: "Unknown", name: "Unknown" };
    return { id: emp.id, name: emp.name };
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Pending Leave Requests</h2>
      {requests.map((req) => {
        const { id, name } = getEmployeeInfo(req.email);
        return (
          <div key={req.id} className="border p-4 rounded mb-4">
            <p>
              <strong>{id} - {name}</strong> applied for leave on{" "}
              <strong>{req.date}</strong>
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
                Status:{" "}
                <strong className="capitalize">{req.status}</strong>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
