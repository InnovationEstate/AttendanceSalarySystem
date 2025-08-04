"use client";

import { useState } from "react";

const requiredDocs = ["aadhar", "pan", "bank", "photo"];
const optionalDocs = ["experience"];

export default function EmployeeDocuments() {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [docs, setDocs] = useState({});
  const [existingDocs, setExistingDocs] = useState({});
  const [message, setMessage] = useState("");
  const [verified, setVerified] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setDocs({ ...docs, [e.target.name]: e.target.files });
  };

  const isStrongPassword = (pass) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(pass);

  // Verify existing user or initialize new user creation
  const verifyOrInitialize = async () => {
    setMessage("");
    if (!employeeId) {
      setMessage("Please enter Employee ID");
      return;
    }
    if (!password && !isNewUser) {
      setMessage("Please enter password");
      return;
    }

    setLoading(true);

    try {
      const metaRes = await fetch("/api/documents/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, password }),
      });

      if (metaRes.ok) {
        const metaData = await metaRes.json();
        if (metaData.success) {
          setVerified(true);
          setIsNewUser(false);
          setMessage(
            "Password verified! You can now view or upload documents."
          );

          const filesRes = await fetch("/api/documents/get", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ employeeId, password }),
          });

          if (filesRes.ok) {
            const filesData = await filesRes.json();
            setExistingDocs(filesData.files || {});
          } else {
            setExistingDocs({});
          }
        } else {
          setMessage("Verification failed.");
        }
      } else if (metaRes.status === 404) {
        // Employee not found → New user
        setIsNewUser(true);
        setVerified(false);
        setMessage(
          "New user detected. Please create a strong password and upload required documents."
        );
      } else {
        const err = await metaRes.json();
        setMessage(err.error || "Verification failed. Check your credentials.");
      }
    } catch (error) {
      setMessage("Error verifying employee: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // New user: set password and upload docs
  const handleCreatePasswordAndUpload = async () => {
    setMessage("");
    if (!employeeId) {
      setMessage("Employee ID missing");
      return;
    }
    if (!isStrongPassword(newPassword)) {
      setMessage(
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
      );
      return;
    }
    for (const doc of requiredDocs) {
      if (!docs[doc]?.[0]) {
        setMessage(`Missing required document: ${doc}`);
        return;
      }
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("employeeId", employeeId);
      formData.append("password", newPassword);
      for (const doc of [...requiredDocs, ...optionalDocs]) {
        if (docs[doc]?.[0]) {
          formData.append(doc, docs[doc][0]);
        }
      }

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setMessage("Password created and documents uploaded successfully!");
        setVerified(true);
        setIsNewUser(false);
        setPassword(newPassword); // Set password for further use
        setNewPassword("");

        const filesRes = await fetch("/api/documents/get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId, password }),
        });

        if (filesRes.ok) {
          const filesData = await filesRes.json();
          setExistingDocs(filesData.files || {});
        } else {
          setExistingDocs({});
        }
      } else {
        setMessage(
          result.error || "Failed to create password and upload documents."
        );
      }
    } catch (error) {
      setMessage("Error uploading documents: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Existing user upload docs
  const handleUpload = async () => {
    setMessage("");
    if (!employeeId || !password) {
      setMessage("Missing Employee ID or Password.");
      return;
    }
    for (const doc of requiredDocs) {
      if (!docs[doc]?.[0] && !existingDocs[doc]) {
        setMessage(`Missing required document: ${doc}`);
        return;
      }
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("employeeId", employeeId);
      formData.append("password", password);
      for (const doc of [...requiredDocs, ...optionalDocs]) {
        if (docs[doc]?.[0]) {
          formData.append(doc, docs[doc][0]);
        }
      }

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setMessage("Documents uploaded successfully!");
        const filesRes = await fetch("/api/documents/get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId, password }),
        });

        if (filesRes.ok) {
          const filesData = await filesRes.json();
          setExistingDocs(filesData.files || {});
        }
      } else {
        setMessage(result.error || "Upload failed.");
      }
    } catch (error) {
      setMessage("Error uploading documents: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // View uploaded document
  const viewDocument = async (docKey) => {
    if (!employeeId || (!password && !isNewUser)) {
      alert("Missing employee ID or password");
      return;
    }
    try {
      const res = await fetch("/api/documents/serve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          password: isNewUser ? newPassword : password,
          docKey,
        }),
      });

      if (!res.ok) {
        alert("Access denied or file not found.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      alert("Error fetching the document.");
    }
  };

  return (
    <div className="bg-gray-50 flex justify-center items-center p-4 min-h-screen">
      <div className="max-w-lg bg-white rounded shadow p-6 w-full">
        <h2 className="text-2xl font-semibold mb-4">Employee Documents</h2>

        {/* Step 1: Verify or create password */}
        {!verified && !isNewUser && (
          <>
            <input
              type="text"
              placeholder="Employee ID"
              className="w-full mb-3 p-2 border rounded"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value.trim())}
              disabled={loading}
            />
            <input
              type="password"
              placeholder="Enter Password"
              className="w-full mb-4 p-2 border rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <button
              onClick={verifyOrInitialize}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </>
        )}

        {/* Step 2: New user sets password and uploads */}
        {isNewUser && (
          <>
            <input
              type="text"
              placeholder="Employee ID"
              className="w-full mb-3 p-2 border rounded bg-gray-100 cursor-not-allowed"
              value={employeeId}
              disabled
            />
            <input
              type="password"
              placeholder="Create Strong Password"
              className="w-full mb-4 p-2 border rounded"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
            />
            {[...requiredDocs, ...optionalDocs].map((doc) => (
              <div key={doc} className="mb-3">
                <label className="block font-medium capitalize mb-1">
                  {doc} {requiredDocs.includes(doc) && "*"}
                </label>
                <input
                  type="file"
                  name={doc}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            ))}
            <button
              onClick={handleCreatePasswordAndUpload}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 mt-4 transition"
              disabled={loading}
            >
              {loading ? "Processing..." : "Set Password & Upload Documents"}
            </button>
          </>
        )}

        {/* Step 3: Verified user uploads and views docs */}
        {verified && (
          <>
            <input
              type="text"
              placeholder="Employee ID"
              className="w-full mb-3 p-2 border rounded bg-gray-100 cursor-not-allowed"
              value={employeeId}
              disabled
            />
            <input
              type="password"
              placeholder="Enter Password"
              className="w-full mb-4 p-2 border rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />

            <div className="grid gap-5">
              {[...requiredDocs, ...optionalDocs].map((doc) => (
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
                    {existingDocs[doc] && (
                      <button
                        onClick={() => viewDocument(doc)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded shadow"
                        disabled={loading}
                      >
                        View
                      </button>
                    )}
                  </div>

                  {existingDocs[doc] && (
                    <div className="text-gray-500 text-sm italic">
                      Uploaded: {existingDocs[doc]?.name || "Unknown file"}
                    </div>
                  )}

                  <input
                    type="file"
                    name={doc}
                    onChange={handleChange}
                    className="text-sm"
                    disabled={loading}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleUpload}
              className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition"
              disabled={loading}
            >
              {loading ? "Uploading..." : "Upload Documents"}
            </button>
          </>
        )}

        {message && <p className="mt-4 text-center text-red-600">{message}</p>}
      </div>
    </div>
  );
}
