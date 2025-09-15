

"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, get, set, remove } from "firebase/database";

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    number: "",
    designation: "",
    salary: "",
    joiningDate: "",
  });
  const [editingKey, setEditingKey] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // 🔹 Delete confirmation modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    try {
      const snapshot = await get(ref(db, "employees"));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const employeeList = Object.entries(data).map(([key, value]) => ({
          firebaseKey: key,
          ...value,
        }));
        setEmployees(employeeList);
      } else {
        setEmployees([]);
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  }

  function handleAddClick() {
    setForm({
      name: "",
      email: "",
      number: "",
      designation: "",
      salary: "",
      joiningDate: "",
    });
    setEditingKey(null);
    setShowForm(true);
    scrollToForm();
  }

  function handleEdit(emp) {
    setForm(emp);
    setEditingKey(emp.firebaseKey);
    setShowForm(true);
    scrollToForm();
  }

  function handleCancel() {
    setForm({
      name: "",
      email: "",
      number: "",
      designation: "",
      salary: "",
      joiningDate: "",
    });
    setEditingKey(null);
    setShowForm(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
// Get all employees
const employeesRef = ref(db, "employees");
const snapshot = await get(employeesRef);
const data = snapshot.exists() ? snapshot.val() : {};

// Convert data object to array of employees
const currentEmployees = Object.values(data);

// Extract numeric parts of IDs and find the max
let maxIdNumber = 0;
currentEmployees.forEach(emp => {
  const match = emp.id.match(/IE25(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num > maxIdNumber) maxIdNumber = num;
  }
});

// Generate new ID by incrementing maxIdNumber
const newIdNumber = maxIdNumber + 1;
const newId = `IE25${String(newIdNumber).padStart(3, "0")}`;

// Prepare new employee data
const employeeData = {
  ...form,
  id: newId,
};

// Save using push to avoid overriding any key
await set(ref(db, `employees/${newId}`), employeeData);


      handleCancel();
      fetchEmployees();
    } catch (err) {
      console.error("Error saving employee:", err);
    }
  }

  // 🔹 Show modal before delete
  function handleDeleteClick(emp) {
    setEmployeeToDelete(emp);
    setShowDeleteModal(true);
  }

  // 🔹 Confirm delete
  async function handleDeleteConfirm() {
    if (!employeeToDelete) return;
    try {
      await remove(ref(db, `employees/${employeeToDelete.firebaseKey}`));
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
      fetchEmployees();
    } catch (err) {
      console.error("Error deleting employee:", err);
    }
  }

  function handleCancelDelete() {
    setEmployeeToDelete(null);
    setShowDeleteModal(false);
  }

  function scrollToForm() {
    setTimeout(() => {
      const formElement = document.getElementById("employee-form");
      if (formElement) {
        formElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  }

  return (
    <main className="p-4 sm:p-6 bg-gray-50 min-h-screen text-sm sm:text-base">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-lg sm:text-2xl font-bold">
          Total Employees: {employees.length}
        </h1>
        <button
          onClick={handleAddClick}
          className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 text-sm sm:text-base cursor-pointer"
        >
          Add Employee
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form
          id="employee-form"
          onSubmit={handleSubmit}
          className={`space-y-3 sm:space-y-4 mb-8 p-4 rounded shadow max-w-md text-sm sm:text-base bg-white transition-all duration-300 ${
            editingKey ? "border-2 border-yellow-400" : ""
          }`}
        >
          <input
            type="text"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="text"
            placeholder="Phone Number"
            value={form.number}
            onChange={(e) => setForm({ ...form, number: e.target.value })}
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="text"
            placeholder="Designation"
            value={form.designation}
            onChange={(e) =>
              setForm({ ...form, designation: e.target.value })
            }
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="number"
            placeholder="Salary"
            value={form.salary}
            onChange={(e) => setForm({ ...form, salary: e.target.value })}
            className="w-full p-2 border rounded"
            required
          />
          <input
            type="date"
            placeholder="Joining Date"
            value={form.joiningDate}
            onChange={(e) =>
              setForm({ ...form, joiningDate: e.target.value })
            }
            className="w-full p-2 border rounded"
            required
          />

          <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
            <button
              type="submit"
              className={`px-4 py-2 rounded text-white cursor-pointer ${
                editingKey
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {editingKey ? "Save Changes" : "Add Employee"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded bg-gray-400 hover:bg-gray-500 text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Employee Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow rounded text-sm sm:text-base">
          <thead>
            <tr className="bg-blue-100">
              <th className="p-3 text-left">ID</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Number</th>
              <th className="p-3 text-left">Designation</th>
              <th className="p-3 text-left">Salary</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr
                key={emp.firebaseKey}
                className="border-t hover:bg-gray-50 transition"
              >
                <td className="p-3">{emp.id}</td>
                <td className="p-3">{emp.name}</td>
                <td className="p-3">{emp.email}</td>
                <td className="p-3">{emp.number}</td>
                <td className="p-3">{emp.designation}</td>
                <td className="p-3">{emp.salary}</td>
                <td className="p-3 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => handleEdit(emp)}
                    className="px-3 py-1 bg-yellow-400 rounded text-white hover:bg-yellow-500 cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(emp)}
                    className="px-3 py-1 bg-red-500 rounded text-white hover:bg-red-600 cursor-pointer"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 🔹 Delete Confirmation Modal */}
      {showDeleteModal && employeeToDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-80 text-center">
            <h2 className="text-lg font-bold mb-4">Confirm Delete</h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete{" "}
              <span className="font-semibold">{employeeToDelete.name}</span>?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Yes, Delete
              </button>
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
