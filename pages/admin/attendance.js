// "use client";

// import { useEffect, useState } from "react";
// import * as XLSX from "xlsx";

// export default function AdminAttendance() {
//   const [selectedDate, setSelectedDate] = useState(getTodayDate());
//   const [attendance, setAttendance] = useState([]);
//   const [employees, setEmployees] = useState([]);

//   useEffect(() => {
//     async function fetchData() {
//       try {
//         const empRes = await fetch("/api/employee/getEmployees");
//         const attRes = await fetch("/api/attendance/get");

//         const empData = await empRes.json();
//         const attData = await attRes.json();

//         setEmployees(empData || []);
//         setAttendance(attData.data || attData || []);
//       } catch (err) {
//         console.error("Error fetching data:", err);
//       }
//     }

//     fetchData();
//   }, []);

//   function getTodayDate() {
//     const now = new Date();
//     return now.toISOString().split("T")[0];
//   }

//   function getDayName(dateStr) {
//     try {
//       const date = new Date(dateStr);
//       return date.toLocaleDateString("en-IN", { weekday: "long" });
//     } catch {
//       return "";
//     }
//   }

//   function toIst12HourFormat(utcTimeStr) {
//     if (!utcTimeStr) return "";
//     try {
//       const utcDate = new Date(utcTimeStr);
//       const istDate = new Date(utcDate.getTime());
//       let hours = istDate.getHours();
//       const minutes = istDate.getMinutes().toString().padStart(2, "0");
//       const ampm = hours >= 12 ? "PM" : "AM";
//       hours = hours % 12 || 12;
//       return `${hours}:${minutes} ${ampm}`;
//     } catch {
//       return "";
//     }
//   }

//   function formatLocationLink(address, lat, lon) {
//     if (!address) return "N/A";
//     const mapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;
//     return (
//       <a
//         href={mapsUrl}
//         target="_blank"
//         rel="noopener noreferrer"
//         className="text-blue-600 underline"
//         title={address}
//       >
//         {address.length > 30 ? address.slice(0, 30) + "..." : address}
//       </a>
//     );
//   }

//   const employeeMap = new Map(
//     employees.map((emp) => [(emp.email || "").toLowerCase(), emp])
//   );

//   const attendanceForDate = attendance.filter(
//     (att) => att.date === selectedDate
//   );

//   const presentEmployees = attendanceForDate
//     .filter((att) => {
//       if (att.status) {
//         return att.status.toLowerCase() === "present";
//       }
//       return Boolean(att.login);
//     })
//     .map((att) => {
//       const emp = employeeMap.get((att.email || "").toLowerCase()) || {};
//       return {
//         id: emp.id || "N/A",
//         name: emp.name || att.name || "N/A",
//         email: emp.email || att.email || "N/A",
//         designation: emp.designation || "N/A",
//         loginTime: toIst12HourFormat(att.login),
//         location: {
//          address: att.location?.address || "",
//         lat: att.location?.latitude || "",
//         lon: att.location?.longitude || "",
//         },
//         status: "Present",
//         // status: att.status || "Absent"
//       };
//     });

//   const fallbackEmployees =
//     presentEmployees.length === 0
//       ? employees.map((emp) => {
//           const email = (emp.email || "").toLowerCase();
//           const att = attendance.find(
//             (a) =>
//               (a.email || "").toLowerCase() === email &&
//               a.date === selectedDate
//           );

//           let status = "No Record";
//           if (att?.status) {
//             status =
//               att.status.charAt(0).toUpperCase() + att.status.slice(1);
//           } else {
//             const day = new Date(selectedDate).getDay();
//             status = day === 2 ? "Week Off" : "Absent or No Login";
//           }

//           return {
//             id: emp.id || "N/A",
//             name: emp.name || "N/A",
//             email: emp.email || "N/A",
//             designation: emp.designation || "N/A",
//             loginTime: "",
//             location: null,
//             status,
//           };
//         })
//       : [];

//   function exportExcel(data, fileName) {
//     const worksheet = XLSX.utils.json_to_sheet(data);
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
//     XLSX.writeFile(workbook, `${fileName}.xlsx`);
//   }

//   function downloadDayAttendance() {
//     const data = (presentEmployees.length > 0 ? presentEmployees : fallbackEmployees).map(emp => ({
//       ID: emp.id,
//       Name: emp.name,
//       Email: emp.email,
//       Designation: emp.designation,
//       LoginTime: emp.loginTime,
//       Location: emp.location?.address || "N/A",
//       Status: emp.status,
//     }));
//     exportExcel(data, `Attendance_${selectedDate}`);
//   }

//   function downloadMonthlyAttendance() {
//     const month = selectedDate.slice(0, 7); // YYYY-MM
//     const data = attendance
//       .filter((a) => a.date.startsWith(month))
//       .map((a) => ({
//         Name: a.name,
//         Email: a.email,
//         Date: a.date,
//         Login: toIst12HourFormat(a.login),
//         Location: a.location?.address || "",
//         Status: a.status || (a.login ? "Present" : "Absent"),
//       }));
//     exportExcel(data, `Attendance_${month}`);
//   }

//  return (
//   <main className="p-4 sm:p-6 bg-gray-100 min-h-screen text-xs sm:text-sm md:text-base">
//     {/* Header */}
//     <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
//       <div>
//         <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
//           Attendance - {selectedDate} ({getDayName(selectedDate)})
//         </h1>
//         <p className="mt-1 font-medium text-green-700">
//           Total Present: {presentEmployees.length}
//         </p>
//       </div>

//       {/* Download Dropdown */}
//       <div className="relative w-full md:w-auto group">
//         <button className="w-full md:w-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium">
//           Download Summary
//         </button>
//         <div className="absolute right-0 mt-1 hidden group-hover:block bg-white border rounded shadow z-10 w-full md:w-48">
//           <button
//             onClick={downloadDayAttendance}
//             className="block w-full px-4 py-2 hover:bg-gray-100 text-left text-sm"
//           >
//             By Date
//           </button>
//           <button
//             onClick={downloadMonthlyAttendance}
//             className="block w-full px-4 py-2 hover:bg-gray-100 text-left text-sm"
//           >
//             By Month
//           </button>
//         </div>
//       </div>
//     </div>

//     {/* Date Selector */}
//     <div className="mb-5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
//       <label htmlFor="date" className="font-medium text-gray-700">
//         Select Date:
//       </label>
//       <input
//         type="date"
//         id="date"
//         value={selectedDate}
//         onChange={(e) => setSelectedDate(e.target.value)}
//         className="border rounded px-3 py-2 text-xs sm:text-sm max-w-xs w-full shadow-sm"
//         max={getTodayDate()}
//       />
//     </div>

//     {/* Attendance Table */}
//     <div className="overflow-x-auto rounded shadow-sm border bg-white">
//       <table className="min-w-full text-xs sm:text-sm table-auto">
//         <thead className="bg-blue-100 text-gray-800">
//           <tr>
//             <th className="px-3 py-2 text-left whitespace-nowrap">ID</th>
//             <th className="px-3 py-2 text-left whitespace-nowrap">Name</th>
//             <th className="px-3 py-2 text-left whitespace-nowrap">Email</th>
//             <th className="px-3 py-2 text-left whitespace-nowrap">Designation</th>
//             <th className="px-3 py-2 text-left whitespace-nowrap">Login Time</th>
//             <th className="px-3 py-2 text-left whitespace-nowrap">Location</th>
//             <th className="px-3 py-2 text-left whitespace-nowrap">Status</th>
//           </tr>
//         </thead>
//         <tbody>
//           {(presentEmployees.length > 0 ? presentEmployees : fallbackEmployees).map((emp) => (
//             <tr key={emp.email} className="border-t hover:bg-gray-50">
//               <td className="px-3 py-2 whitespace-nowrap">{emp.id}</td>
//               <td className="px-3 py-2 whitespace-nowrap">{emp.name}</td>
//               <td className="px-3 py-2 whitespace-nowrap">{emp.email}</td>
//               <td className="px-3 py-2 whitespace-nowrap">{emp.designation}</td>
//               <td className="px-3 py-2 whitespace-nowrap">{emp.loginTime}</td>
//               <td className="px-3 py-2 whitespace-nowrap">
//                 {emp.location
//                   ? formatLocationLink(emp.location.address, emp.location.lat, emp.location.lon)
//                   : "N/A"}
//               </td>
//               <td className="px-3 py-2 whitespace-nowrap font-semibold">
//                 {emp.status}
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   </main>
// );


// }

"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";

export default function AdminAttendance() {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [attendanceData, setAttendanceData] = useState([]);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    // Fetch all employees once
    const empRef = ref(db, "employees");
    const unsubEmp = onValue(empRef, (snapshot) => {
      const data = snapshot.val();
      setEmployees(data ? Object.values(data) : []);
    });

    return () => unsubEmp();
  }, []);

  useEffect(() => {
    if (!selectedDate) return;

    // Fetch attendance for selected date
    const attRef = ref(db, `attendance/${selectedDate}`);
    const unsubAtt = onValue(attRef, (snapshot) => {
      const data = snapshot.val();
      const formatted = data ? Object.entries(data).map(([email, value]) => ({ email, ...value })) : [];
      setAttendanceData(formatted);
    });

    return () => unsubAtt();
  }, [selectedDate]);

  function getTodayDate() {
    const now = new Date();
    return now.toISOString().split("T")[0];
  }

  function getDayName(dateStr) {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN", { weekday: "long" });
    } catch {
      return "";
    }
  }

  function toIst12HourFormat(utcTimeStr) {
    if (!utcTimeStr) return "";
    try {
      const date = new Date(utcTimeStr);
      const hours = date.getHours() % 12 || 12;
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const ampm = date.getHours() >= 12 ? "PM" : "AM";
      return `${hours}:${minutes} ${ampm}`;
    } catch {
      return "";
    }
  }

  function formatLocationLink(address, lat, lon) {
    if (!address) return "N/A";
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;
    return (
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline"
        title={address}
      >
        {address.length > 30 ? address.slice(0, 30) + "..." : address}
      </a>
    );
  }

  const employeeMap = new Map(
    employees.map((emp) => [(emp.email || "").toLowerCase(), emp])
  );

  const presentEmployees = attendanceData
    .filter((att) => att.istLoginTime)
    .map((att) => {
      const email = (att.email || "").toLowerCase();
      const emp = employeeMap.get(email) || {};
      return {
        id: emp.id || "N/A",
        name: emp.name || att.name || "N/A",
        email: att.email || "N/A",
        designation: emp.designation || "N/A",
        loginTime: toIst12HourFormat(att.istLoginTime),
        location: {
          address: att.location?.address || "",
          lat: att.location?.latitude || "",
          lon: att.location?.longitude || "",
        },
        status: "Present",
      };
    });

  // Handle fallback case for employees without login
  const fallbackEmployees = employees
    .filter((emp) => {
      const email = (emp.email || "").toLowerCase();
      return !presentEmployees.some((pe) => pe.email.toLowerCase() === email);
    })
    .map((emp) => {
      const day = new Date(selectedDate).getDay();
      const status = day === 2 ? "Week Off" : "Absent";
      return {
        id: emp.id || "N/A",
        name: emp.name || "N/A",
        email: emp.email || "N/A",
        designation: emp.designation || "N/A",
        loginTime: "",
        location: null,
        status,
      };
    });

  function exportExcel(data, fileName) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  }

  function downloadDayAttendance() {
    const data = [...presentEmployees, ...fallbackEmployees].map((emp) => ({
      ID: emp.id,
      Name: emp.name,
      Email: emp.email,
      Designation: emp.designation,
      LoginTime: emp.loginTime || "N/A",
      Location: emp.location?.address || "N/A",
      Status: emp.status,
    }));
    exportExcel(data, `Attendance_${selectedDate}`);
  }

  function downloadMonthlyAttendance() {
    // Optional: implement based on full month-wise structure if needed
    alert("Monthly export not supported in this real-time view.");
  }

  return (
    <main className="p-4 sm:p-6 bg-gray-100 min-h-screen text-xs sm:text-sm md:text-base">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
            Attendance - {selectedDate} ({getDayName(selectedDate)})
          </h1>
          <p className="mt-1 font-medium text-green-700">
            Total Present: {presentEmployees.length}
          </p>
        </div>

        {/* Download Dropdown */}
        <div className="relative w-full md:w-auto group">
          <button className="w-full md:w-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-medium">
            Download Summary
          </button>
          <div className="absolute right-0 mt-1 hidden group-hover:block bg-white border rounded shadow z-10 w-full md:w-48">
            <button
              onClick={downloadDayAttendance}
              className="block w-full px-4 py-2 hover:bg-gray-100 text-left text-sm"
            >
              By Date
            </button>
            <button
              onClick={downloadMonthlyAttendance}
              className="block w-full px-4 py-2 hover:bg-gray-100 text-left text-sm"
            >
              By Month
            </button>
          </div>
        </div>
      </div>

      {/* Date Selector */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <label htmlFor="date" className="font-medium text-gray-700">
          Select Date:
        </label>
        <input
          type="date"
          id="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border rounded px-3 py-2 text-xs sm:text-sm max-w-xs w-full shadow-sm"
          max={getTodayDate()}
        />
      </div>

      {/* Attendance Table */}
      <div className="overflow-x-auto rounded shadow-sm border bg-white">
        <table className="min-w-full text-xs sm:text-sm table-auto">
          <thead className="bg-blue-100 text-gray-800">
            <tr>
              <th className="px-3 py-2 text-left whitespace-nowrap">ID</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Name</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Email</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Designation</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Login Time</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Location</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody>
            {[...presentEmployees, ...fallbackEmployees].map((emp) => (
              <tr key={emp.email} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap">{emp.id}</td>
                <td className="px-3 py-2 whitespace-nowrap">{emp.name}</td>
                <td className="px-3 py-2 whitespace-nowrap">{emp.email}</td>
                <td className="px-3 py-2 whitespace-nowrap">{emp.designation}</td>
                <td className="px-3 py-2 whitespace-nowrap">{emp.loginTime}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {emp.location
                    ? formatLocationLink(
                        emp.location.address,
                        emp.location.lat,
                        emp.location.lon
                      )
                    : "N/A"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap font-semibold">
                  {emp.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
