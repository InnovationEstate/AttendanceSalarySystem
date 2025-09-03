
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ref as storageRef,
  uploadBytesResumable,
} from "firebase/storage";
import { db, storage } from "../../lib/firebase";
import { get, ref as dbRef, set } from "firebase/database";

const requiredDocs = ["aadhar", "pan", "bank", "photo"];
const optionalDocs = ["experience"];
const docLabels = {
  aadhar: "Aadhar Card",
  pan: "PAN Card",
  bank: "Bank Details",
  photo: "Photograph",
  experience: "Experience Letter",
};

export default function EmployeeDocuments() {
  const [employee, setEmployee] = useState(null); // employee object from localStorage
  const [employeeId, setEmployeeId] = useState(""); // e.g. IE25002
  const [docs, setDocs] = useState({});
  const [existingDocs, setExistingDocs] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const allDocKeys = useMemo(() => [...requiredDocs, ...optionalDocs], []);

  // Load employee info from localStorage & fetch employeeId from DB
  useEffect(() => {
    try {
      const stored = localStorage.getItem("employee");
      if (stored) {
        const emp = JSON.parse(stored);
        setEmployee(emp);
        findEmployeeByEmail(emp.email);
      } else {
        setMessage("No employee found in localStorage.");
      }
    } catch (err) {
      setMessage("Failed to parse employee from localStorage.");
    }
  }, []);

  // 1️⃣ Find employeeId in employees database by email
  const findEmployeeByEmail = async (email) => {
    if (!email) return;
    setLoading(true);
    try {
      const employeesRef = dbRef(db, "employees");
      const snapshot = await get(employeesRef);

      if (snapshot.exists()) {
        const allEmployees = snapshot.val();

        // employees are stored as numeric keys (0,1,2,…)
        const found = Object.values(allEmployees).find(
          (emp) => emp.email === email
        );

        if (found) {
          setEmployeeId(found.id); // <-- use the "id" field inside employee object
          fetchDocuments(found.id);
        } else {
          setMessage("Employee not found for this email.");
        }
      } else {
        setMessage("No employees found in database.");
      }
    } catch (err) {
      setMessage("Error fetching employeeId: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2️⃣ Fetch documents for employeeId
  const fetchDocuments = async (empId) => {
    if (!empId) return;
    try {
      const docsRef = dbRef(db, `documents/${empId}`);
      const snapshot = await get(docsRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        setExistingDocs(data.files || {});
      } else {
        setExistingDocs({});
      }
    } catch (err) {
      setMessage("Error fetching documents: " + err.message);
    }
  };

  // Handle file input
  const handleChange = (e) => {
    setDocs((prev) => ({ ...prev, [e.target.name]: e.target.files[0] }));
  };

  // 3️⃣ Upload selected files to Storage and save metadata in DB
  const uploadDocuments = async () => {
    if (!employeeId || !employee?.email) {
      setMessage("Cannot upload: employee not found.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const uploadedFiles = { ...existingDocs };

      for (const key of Object.keys(docs)) {
        const file = docs[key];
        if (!file) continue;

        const fileExt = file.name.split(".").pop();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const storagePath = `documents/${employeeId}/${key}_${Date.now()}.${
          fileExt || "bin"
        }`;
        const fileRef = storageRef(storage, storagePath);

        await uploadBytesResumable(fileRef, file);

        uploadedFiles[key] = {
          name: storagePath,
          originalName: safeName,
        };
      }

      await set(dbRef(db, `documents/${employeeId}`), {
        employeeId,
        email: employee.email,
        files: uploadedFiles,
      });

      setMessage("Documents uploaded successfully.");
      setDocs({});
      setExistingDocs(uploadedFiles);
    } catch (error) {
      setMessage("Upload failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 4️⃣ Instead of exposing Firebase URL, open our clean API endpoint
  const viewDocument = (docKey) => {
    if (!employeeId || !existingDocs[docKey]) {
      alert("No file available for this document.");
      return;
    }

    // 🔗 Open your custom API endpoint, not Firebase URL
    window.open(
      `/api/documents/view?employeeId=${employeeId}&docKey=${docKey}`,
      "_blank"
    );
  };

 return (
  <div className="bg-gray-50 flex justify-center items-center p-4 min-h-screen">
    <div className="w-full max-w-lg md:max-w-2xl bg-white rounded-lg shadow p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
          Employee Documents
        </h2>
        {employeeId && (
          <span className="text-xs sm:text-sm text-gray-600">
            ID: {employeeId}
          </span>
        )}
      </div>

      {/* Documents Grid */}
      <div className="grid gap-4 sm:gap-5">
        {allDocKeys.map((doc) => (
          <div
            key={doc}
            className="bg-gray-50 border rounded-lg p-3 sm:p-4 shadow-sm flex flex-col gap-2"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="font-medium text-gray-700">
              {docLabels[doc] || doc}{" "}
              {requiredDocs.includes(doc) && (
                <span className="text-red-500">*</span>
              )}
            </div>


              {existingDocs[doc] ? (
                <button
                  onClick={() => viewDocument(doc)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm px-2 sm:px-3 py-1 rounded"
                  disabled={loading}
                >
                  View
                </button>
              ) : (
                <span className="text-xs text-gray-500">Not uploaded</span>
              )}
            </div>

            {existingDocs[doc] && (
              <div className="text-gray-800 text-xs sm:text-sm italic truncate">
                Uploaded: {existingDocs[doc]?.originalName || "Unknown file"}
              </div>
            )}

            <input
              type="file"
              name={doc}
              onChange={handleChange}
              className="text-xs sm:text-sm"
              disabled={loading || !employeeId}
            />
          </div>
        ))}
      </div>

      {/* Upload Button */}
      <button
        onClick={uploadDocuments}
        className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition text-sm sm:text-base"
        disabled={loading || !employeeId}
      >
        {loading ? "Uploading..." : "Upload Selected Files"}
      </button>

      {/* Message */}
      {message && (
        <p className="mt-4 text-center text-red-600 whitespace-pre-wrap text-sm sm:text-base">
          {message}
        </p>
      )}
    </div>
  </div>
);

}
