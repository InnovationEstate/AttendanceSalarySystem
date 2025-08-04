// pages/admin/documents.js
"use client";

import { useState, useEffect } from "react";

export default function AdminDocuments() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [files, setFiles] = useState({});
  const [message, setMessage] = useState("");

  // Fetch employees once on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch("/api/employee/getEmployees");
        const data = await res.json();
        console.log("Fetched employee data:", data);

        if (!res.ok) {
          console.error("API response not OK:", res.status);
          setMessage("Failed to load employee list.");
          return;
        }

        if (!Array.isArray(data)) {
          console.error("Expected array but got:", data);
          setMessage("Invalid employee data format.");
          return;
        }

        setEmployees(data); // ✅ direct array assignment
        setMessage("");
      } catch (err) {
        console.error("Error fetching employees:", err);
        setMessage("Error loading employees.");
      }
    };

    fetchEmployees();
  }, []);

  // Fetch documents for selected employee
  const fetchDocuments = async (employeeId) => {
    setSelectedEmp(employeeId);
    setFiles({});
    setMessage("Loading documents...");

    try {
      const res = await fetch("/api/documents/get", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ employeeId, isAdmin: true }),
      });

      const data = await res.json();

      if (res.ok) {
        setFiles(data.files || {});
        setMessage("");
      } else {
        setMessage(data.error || "Failed to fetch documents.");
        console.error("Failed to fetch documents:", data);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
      setMessage("Failed to fetch documents.");
    }
  };

  // View or download document
  const viewDocument = async (docKey) => {
    if (!selectedEmp) {
      alert("Please select an employee first.");
      return;
    }
    if (!docKey) {
      alert("Document key is missing.");
      return;
    }

    console.log(
      "Requesting document for employee:",
      selectedEmp,
      "docKey:",
      docKey
    );

    try {
      const res = await fetch("/api/documents/serve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmp,
          docKey,
          isAdmin: true, // Admin access flag
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Server responded with error:", res.status, errorText);
        alert("Access denied or file not found.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      alert("Failed to load document.");
      console.error("Error loading document:", err);
    }
  };

  // Download document
  const downloadDocument = async (docKey) => {
    try {
      const res = await fetch("/api/documents/serve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmp,
          docKey,
          isAdmin: true,
        }),
      });

      if (!res.ok) {
        alert("Access denied or file not found.");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedEmp}_${docKey}`; // or use actual filename if available
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download file.");
    }
  };

  return (
    <div className=" bg-gray-50 flex justify-center items-start p-6">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Employee List */}
        <div className="bg-white rounded shadow p-4">
          <h3 className="text-xl font-semibold mb-4">Employees</h3>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {employees.map((emp) => (
              <div
                key={emp.id}
                onClick={() => fetchDocuments(emp.id)}
                className={`cursor-pointer p-2 rounded border ${
                  selectedEmp === emp.id ? "bg-blue-100" : "hover:bg-gray-100"
                }`}
              >
                <strong>{emp.name}</strong>
                <div className="text-sm text-gray-500">{emp.id}</div>
              </div>
            ))}
          </div>
          {message && !selectedEmp && (
            <p className="mt-4 text-red-600">{message}</p>
          )}
        </div>

        {/* Documents View / Download */}
        <div className="md:col-span-2 bg-white rounded shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">
            {selectedEmp
              ? `Documents for ${selectedEmp}`
              : "Select an Employee"}
          </h2>

          {message && selectedEmp && (
            <p className="text-red-600 mb-4">{message}</p>
          )}

          <div className="space-y-3">
            {Object.entries(files).length === 0 && selectedEmp && !message && (
              <p>No documents uploaded yet.</p>
            )}

            {Object.entries(files).map(([docKey, filename]) => (
              <div
                key={docKey}
                className="flex items-center justify-between border rounded p-2"
              >
                <span className="capitalize font-medium">{docKey}</span>

                <div className="flex space-x-4 ">
                  <button
                    onClick={() => viewDocument(docKey)}
                    className="text-blue-600 hover:cursor-pointer"
                  >
                    View
                  </button>

                  <button
                    onClick={() => downloadDocument(docKey)}
                    className="text-green-600  hover:cursor-pointer"
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
