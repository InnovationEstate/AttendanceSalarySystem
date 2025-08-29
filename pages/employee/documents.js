
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
      <div className="max-w-lg bg-white rounded shadow p-6 w-full">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-semibold">Employee Documents</h2>
          {employeeId && (
            <span className="text-sm text-gray-600">ID: {employeeId}</span>
          )}
        </div>

        {/* Documents Grid */}
        <div className="grid gap-5">
          {allDocKeys.map((doc) => (
            <div
              key={doc}
              className="bg-gray-50 border rounded-lg p-4 shadow-sm flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium capitalize">
                  {doc}{" "}
                  {requiredDocs.includes(doc) && (
                    <span className="text-red-500">*</span>
                  )}
                </div>

                {existingDocs[doc] ? (
                  <button
                    onClick={() => viewDocument(doc)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded"
                    disabled={loading}
                  >
                    View
                  </button>
                ) : (
                  <span className="text-xs text-gray-500">Not uploaded</span>
                )}
              </div>

              {existingDocs[doc] && (
                <div className="text-gray-500 text-sm italic">
                  Uploaded: {existingDocs[doc]?.originalName || "Unknown file"}
                </div>
              )}

              <input
                type="file"
                name={doc}
                onChange={handleChange}
                className="text-sm"
                disabled={loading || !employeeId}
              />
            </div>
          ))}
        </div>

        <button
          onClick={uploadDocuments}
          className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition"
          disabled={loading || !employeeId}
        >
          {loading ? "Uploading..." : "Upload Selected Files"}
        </button>

        {message && (
          <p className="mt-4 text-center text-red-600 whitespace-pre-wrap">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
