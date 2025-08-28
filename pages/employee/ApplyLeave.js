
"use client";

import { useEffect, useState } from "react";
import { getDatabase, ref, push, query, orderByChild, equalTo, onValue } from "firebase/database";
import { app } from "../../lib/firebase";

export default function ApplyLeave() {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [leaveList, setLeaveList] = useState([]);
  const [employee, setEmployee] = useState(null);
  const [isSubmittingHalfDay, setIsSubmittingHalfDay] = useState(false); // To track half-day submission

  useEffect(() => {
    const emp = JSON.parse(localStorage.getItem("employee"));
    if (emp) {
      setEmployee(emp);
      fetchLeaveHistory(emp.email);
    }
  }, []);

  const fetchLeaveHistory = (email) => {
    const db = getDatabase(app);
    const leaveRef = ref(db, "leaveRequests");

    // Query leave requests for this employee email
    const q = query(leaveRef, orderByChild("email"), equalTo(email));

    onValue(
      q,
      (snapshot) => {
        const data = snapshot.val() || {};
        const leaves = Object.entries(data).map(([key, val]) => ({
          id: key,
          ...val,
        }));
        leaves.sort((a, b) => new Date(b.date) - new Date(a.date));
        setLeaveList(leaves);
      },
      (error) => {
        console.error("Failed to fetch leave requests:", error);
        setLeaveList([]);
      }
    );
  };

  const handleApply = async (halfDay = false) => {
    if (!employee) return setMessage("Employee not found.");

    if (!date) return setMessage("Please select a leave date.");
    if (!reason && !halfDay) return setMessage("Please enter a reason."); // For half day, reason optional? You can tweak this

    setMessage("");
    if (halfDay) setIsSubmittingHalfDay(true);

    const db = getDatabase(app);
    const leaveRef = ref(db, "leaveRequests");

    // Check for duplicate leave for same date
    const q = query(leaveRef, orderByChild("email_date"), equalTo(`${employee.email}_${date}`));
    let duplicate = false;

    // One-time read to check for duplicates
    await new Promise((resolve) => {
      onValue(
        q,
        (snapshot) => {
          if (snapshot.exists()) duplicate = true;
          resolve();
        },
        { onlyOnce: true }
      );
    });

    if (duplicate) {
      setMessage("You have already applied for leave on this date.");
      if (halfDay) setIsSubmittingHalfDay(false);
      return;
    }

    const newLeave = {
      email: employee.email,
      date,
      reason: reason || (halfDay ? "Half day leave" : ""),
      status: "pending",
      timestamp: new Date().toISOString(),
      email_date: `${employee.email}_${date}`, // For quick duplicate checking
      type: halfDay ? "half-day" : "full-day", // new field to indicate half/full day
    };

    try {
      await push(leaveRef, newLeave);
      setMessage(halfDay ? "Half day leave request submitted successfully." : "Leave request submitted successfully.");
      setDate("");
      setReason("");
      if (halfDay) setIsSubmittingHalfDay(false);
      // fetchLeaveHistory updates automatically by onValue listener
    } catch (error) {
      console.error("Error submitting leave request:", error);
      setMessage("Failed to submit leave request.");
      if (halfDay) setIsSubmittingHalfDay(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6">
      <h2 className="text-xl sm:text-2xl font-bold mb-5 text-center text-gray-800">Apply for Leave</h2>

      <div className="bg-white shadow-md rounded-xl border border-gray-200 p-4 sm:p-5 mb-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leave Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter your leave reason..."
              rows={3}
              className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => handleApply(false)}
              className="flex-1 bg-blue-600 text-white text-sm font-semibold py-2 rounded-md hover:bg-blue-700 transition"
              disabled={isSubmittingHalfDay}
            >
              Submit Request
            </button>

            <button
              onClick={() => handleApply(true)}
              className="flex-1 bg-yellow-500 text-white text-sm font-semibold py-2 rounded-md hover:bg-yellow-600 transition"
              disabled={isSubmittingHalfDay}
              title="Apply for Half Day Leave"
            >
              {isSubmittingHalfDay ? "Submitting..." : "Half Day"}
            </button>
          </div>

          {message && <p className="text-sm text-green-600 text-center font-medium mt-2">{message}</p>}
        </div>
      </div>

      <h3 className="text-lg sm:text-xl font-semibold mb-4 text-gray-800">Your Leave History</h3>

      {leaveList.length === 0 ? (
        <p className="text-sm text-gray-500">No leave requests yet.</p>
      ) : (
        <div className="space-y-4">
          {leaveList.map((leave) => (
            <div
              key={leave.id}
              className={`rounded-lg border p-3 sm:p-4 shadow-sm text-sm ${
                leave.status === "approved"
                  ? "border-green-400 bg-green-50"
                  : leave.status === "rejected"
                  ? "border-red-400 bg-red-50"
                  : "border-gray-300 bg-yellow-50"
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-gray-800">
                  {leave.date}{" "}
                  {leave.type === "half-day" && (
                    <span className="text-xs italic text-blue-700 ml-2">(Half Day)</span>
                  )}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    leave.status === "approved"
                      ? "bg-green-100 text-green-700"
                      : leave.status === "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                </span>
              </div>
              <p className="text-gray-600 italic">{leave.reason}</p>
              {leave.status === "approved" && leave.type === "half-day" && (
                <p className="text-blue-700 text-xs mt-1">✅ Half day leave approved and marked in your attendance.</p>
              )}
              {leave.status === "approved" && leave.type !== "half-day" && (
                <p className="text-green-700 text-xs mt-1">✅ Leave approved and marked in your attendance.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
