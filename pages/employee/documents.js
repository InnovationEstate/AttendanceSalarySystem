"use client";

import { useState } from "react";
import { uploadBytesResumable } from "firebase/storage";

import {
  db,
  storage,
} from "../../lib/firebase";

import {
  get,
  update,
  ref as dbRef,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";

import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";


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
    setDocs({ ...docs, [e.target.name]: e.target.files[0] });
  };

  const isStrongPassword = (pass) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(pass);

  // Verify employee password via API
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

      console.log("Meta response:", metaRes);

      if (metaRes.ok) {
        const metaData = await metaRes.json();
        if (metaData.success) {
          setVerified(true);
          setIsNewUser(false);
          setMessage("Password verified! You can now view or upload documents.");
          await fetchExistingDocs(employeeId);
        } else {
          setMessage("Verification failed.");
        }
      } else if (metaRes.status === 404) {
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

  // Fetch existing document metadata from Firebase Realtime Database
 const fetchExistingDocs = async (empId) => {
  console.log("Fetching existing documents for:", empId);
  setLoading(true);

  try {
    // Defensive check
    if (!empId) {
      throw new Error("Employee ID is required");
    }

    // Build query to fetch document where employeeId === empId
    const q = query(
      dbRef(db, "documents"),
      orderByChild("employeeId"),
      equalTo(empId)
    );

    console.log("Query built:", q);

    const snapshot = await get(q);

    console.log("Snapshot received:", snapshot);

    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log("Snapshot data:", data);

      const firstMatchKey = Object.keys(data)[0];
      console.log("First matching key:", firstMatchKey);

      if (firstMatchKey) {
        const employeeRecord = data[firstMatchKey];
        console.log("Employee record found:", employeeRecord);
        setExistingDocs(employeeRecord.files || {});
      } else {
        console.log("No matching key found, setting empty docs");
        setExistingDocs({});
      }
    } else {
      console.log("Snapshot does not exist, setting empty docs");
      setExistingDocs({});
    }
  } catch (error) {
    console.error("Error fetching documents:", error);
    setMessage("Failed to fetch existing documents: " + error.message);
    setExistingDocs({});
  } finally {
    setLoading(false);
    console.log("Loading set to false");
  }
};


  // Upload files to Firebase Storage and update metadata in Realtime Database
  const uploadDocuments = async (useNewPassword = false) => {
  setMessage("");
  if (!employeeId) {
    setMessage("Employee ID is required");
    return;
  }

  if (useNewPassword) {
    if (!newPassword) {
      setMessage("Please enter a new password");
      return;
    }
    if (!isStrongPassword(newPassword)) {
      setMessage(
        "Password must be 8+ characters with uppercase, lowercase, number, and special character"
      );
      return;
    }
  } else {
    if (!password) {
      setMessage("Please enter password");
      return;
    }
  }
    
  console.log("Uploading documents for employee:", employeeId);
  // Check all required docs are selected
  for (const doc of requiredDocs) {
    if (!docs[doc] && !existingDocs[doc]) {
      setMessage(`Please upload required document: ${doc}`);
      return;
    }
  }

  setLoading(true);
  try {
    const uploadedFiles = { ...existingDocs };

    for (const key of Object.keys(docs)) {
      const file = docs[key];
      if (!file) continue;

      const fileExt = file.name.split(".").pop();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `documents/${employeeId}/${key}_${Date.now()}.${fileExt}`;
      const fileRef = storageRef(storage, storagePath);

      const uploadTask = uploadBytesResumable(fileRef, file);

      await new Promise((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          null,
          (error) => {
            console.error("Upload error:", error);
            reject(error);
          },
          () => {
            // Success
            uploadedFiles[key] = {
              name: storagePath,
              originalName: safeName,
            };
            resolve();
          }
        );
      });
    }

    // Call backend API if password is new
    if (useNewPassword) {
      const formData = new FormData();
      formData.append("employeeId", employeeId);
      formData.append("password", newPassword);
      for (const key of Object.keys(docs)) {
        if (docs[key]) {
          formData.append(key, docs[key]);
        }
      }

      const resp = await fetch("/api/documents/create-password-and-upload", {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Failed to create password and upload");
      }

      setIsNewUser(false);
      setVerified(true);
      setPassword(newPassword);
      setMessage("Password set and documents uploaded successfully");
    } else {
      // Existing user: update DB metadata
      const docRef = dbRef(db, `documents/${employeeId}`);
      await update(docRef, { files: uploadedFiles });
      setMessage("Documents uploaded successfully");
    }

    setDocs({});
    await fetchExistingDocs(employeeId);
  } catch (error) {
    console.error("Upload failed:", error);
    setMessage("Upload failed: " + error.message);
  } finally {
    setLoading(false);
  }
};

  // View document by fetching download URL from Firebase Storage
  const viewDocument = async (docKey) => {
  if (!employeeId) {
    alert("Missing Employee ID");
    return;
  }

  const fileMeta = existingDocs[docKey];
  if (!fileMeta || !fileMeta.name) {
    alert("No file available for this document.");
    return;
  }

  try {
    // Construct a non-root path reference (folder + filename)
    const fileRef = storageRef(storage, `uploads-private/${fileMeta.name}`);

    // Get downloadable URL
    const url = await getDownloadURL(fileRef);

    // Open the file in a new browser tab
    window.open(url, "_blank");
  } catch (error) {
    alert("Error fetching document: " + error.message);
    console.error("Firebase Storage error:", error);
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
              onClick={() => uploadDocuments(true)}
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
                      Uploaded: {existingDocs[doc]?.originalName || "Unknown file"}
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
              onClick={() => uploadDocuments(false)}
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
