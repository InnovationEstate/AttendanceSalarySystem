"use client";
import { useState, useEffect } from "react";
import { getDatabase, ref, get, child } from "firebase/database";
import { app } from "@/lib/firebase";

export default function AdminDocuments() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [files, setFiles] = useState({});
  const [message, setMessage] = useState("");
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => {
    async function fetchEmployees() {
      setMessage("Loading employees...");
      setLoadingEmployees(true);
      try {
        const db = getDatabase(app);
        const empSnap = await get(child(ref(db), "employees"));
        if (!empSnap.exists()) {
          setMessage("No employees found.");
          setEmployees([]);
          return;
        }

        const empList = [];
        empSnap.forEach((childSnap) => {
          const emp = childSnap.val();
          empList.push(emp);
        });

        setEmployees(empList);
        setMessage("");
      } catch (err) {
        console.error("Error fetching employees:", err);
        setMessage("Error loading employees.");
      } finally {
        setLoadingEmployees(false);
      }
    }
    fetchEmployees();
  }, []);

  const fetchDocuments = async (employeeId) => {
    setSelectedEmp(employeeId);
    setFiles({});
    setMessage("");
    setLoadingDocs(true);
    try {
      const db = getDatabase(app);
      const docsSnap = await get(child(ref(db), `documents/${employeeId}`));

      if (docsSnap.exists()) {
        const data = docsSnap.val();
        const filesObj = data.files || {};

        // Normalize files: convert strings to objects with storagePath + originalName
        const normalizedFiles = {};
        Object.entries(filesObj).forEach(([key, val]) => {
          if (typeof val === "string") {
            normalizedFiles[key] = {
              storagePath: val,
              originalName: val.split("/").pop(),
            };
          } else if (val && typeof val === "object") {
            // Support both 'name' or 'storagePath' key inside object
            normalizedFiles[key] = {
              storagePath: val.storagePath || val.name || "",
              originalName: val.originalName || val.name?.split("/").pop() || key,
            };
          }
        });

        setFiles(normalizedFiles);
        setMessage("");
      } else {
        setFiles({});
        setMessage("No documents found.");
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
      setMessage("Failed to fetch documents.");
    } finally {
      setLoadingDocs(false);
    }
  };

const viewDocument = async (docKey) => {
  if (!selectedEmp) {
    alert("Select an employee first.");
    return;
  }

  try {
    const res = await fetch("/api/documents/serve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: selectedEmp,
        docKey,          // send docKey, not storagePath
        isAdmin: true,   // or false if you want password verification
        // password: "optionalPasswordIfNotAdmin"
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      alert(errorData.error || "Unable to access file.");
      return;
    }

    const data = await res.json();
    if (!data.url) {
      alert("File URL not received.");
      return;
    }

    window.open(data.url, "_blank");
  } catch (error) {
    alert("Failed to fetch document: " + error.message);
  }
};


  const downloadDocument = async (docKey, event) => {
  if (event) event.preventDefault();  // Prevent page reload if called from link/button click
  if (!selectedEmp) return;
  
  const fileMeta = files[docKey];
  if (!fileMeta) {
    alert("File not available for this document.");
    return;
  }
  
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
      alert("Unable to download file.");
      return;
    }
    
    const data = await res.json();
    if (!data.url) {
      alert("File URL not received.");
      return;
    }
    
    // Create a hidden <a> element to trigger download
    const a = document.createElement("a");
    a.href = data.url;
    a.download = fileMeta.originalName || `${selectedEmp}_${docKey}`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error("Download failed:", err);
    alert("Failed to download document.");
  }
};


  return (
    <div className="bg-gray-50 flex justify-center items-start p-6 min-h-screen">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Employee List */}
        <div className="bg-white rounded shadow p-4">
          <h3 className="text-xl font-semibold mb-4">Employees</h3>
          {loadingEmployees && <p>Loading employees...</p>}
          {!loadingEmployees && employees.length === 0 && (
            <p>No employees found.</p>
          )}
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

        {/* Documents Section */}
        <div className="md:col-span-2 bg-white rounded shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">
            {selectedEmp ? `Documents for ${selectedEmp}` : "Select an Employee"}
          </h2>
          {loadingDocs && <p>Loading documents...</p>}
          {message && selectedEmp && (
            <p className="text-red-600 mb-4">{message}</p>
          )}
          {!loadingDocs && selectedEmp && Object.keys(files).length === 0 && (
            <p>No documents uploaded yet.</p>
          )}
          <div className="space-y-3">
            {Object.entries(files).map(([docKey, fileObj]) => (
              <div
                key={docKey}
                className="flex items-center justify-between border rounded p-2"
              >
                <span className="capitalize font-medium">{docKey}</span>
                <div className="flex space-x-4">
                  <button
                    onClick={() => viewDocument(docKey)}
                    className="text-blue-600 hover:cursor-pointer"
                  >
                    View
                  </button>
                  <button
                  download
                    onClick={() => downloadDocument(docKey)}
                    className="text-green-600 hover:cursor-pointer"
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
