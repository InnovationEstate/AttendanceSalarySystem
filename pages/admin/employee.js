"use client";

import { useEffect, useState } from "react";

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
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    const res = await fetch("/api/employee/getEmployees");
    const data = await res.json();
    setEmployees(data);
  }

  async function handleDelete(id) {
    const res = await fetch(`/api/employee/delete/${id}`, {
      method: "DELETE",
    });
    if (res.ok) fetchEmployees();
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
    setEditingId(null);
    setShowForm(true);
    scrollToForm();
  }

  function handleEdit(emp) {
    setForm(emp);
    setEditingId(emp.id);
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
    setEditingId(null);
    setShowForm(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (editingId) {
      await fetch(`/api/employee/update/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/employee/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }

    setForm({
      name: "",
      email: "",
      number: "",
      designation: "",
      salary: "",
      joiningDate: "",
    });
    setEditingId(null);
    setShowForm(false);
    fetchEmployees();
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
            editingId ? "border-2 border-yellow-400" : ""
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
            onChange={(e) => setForm({ ...form, designation: e.target.value })}
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
            onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
            className="w-full p-2 border rounded"
            required
          />

          <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
            <button
              type="submit"
              className={`px-4 py-2 rounded text-white cursor-pointer ${
                editingId
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {editingId ? "Save Changes" : "Add Employee"}
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
              <tr key={emp.id} className="border-t hover:bg-gray-50 transition">
                <td className="p-3">{emp.id}</td>
                <td className="p-3">{emp.name}</td>
                <td className="p-3">{emp.email}</td>
                <td className="p-3">{emp.number}</td>
                <td className="p-3">{emp.designation}</td>
                <td className="p-3">{emp.salary}</td>
                <td className="p-3 space-y-1 sm:space-y-0 sm:space-x-2 flex flex-col sm:flex-row">
                  <button
                    onClick={() => handleEdit(emp)}
                    className="px-3 py-1 bg-yellow-400 rounded text-white hover:bg-yellow-500 cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(emp.id)}
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
    </main>
  );
}
