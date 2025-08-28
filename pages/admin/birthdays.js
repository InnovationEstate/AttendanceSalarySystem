import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { ref, onValue } from "firebase/database";

const AdminBirthdays = () => {
  const [birthdays, setBirthdays] = useState([]);

  useEffect(() => {
    const birthdaysRef = ref(db, "birthdays");
    const employeesRef = ref(db, "employees");

    const unsubscribe = onValue(birthdaysRef, (birthdaySnap) => {
      const birthdaysData = birthdaySnap.val() || {};

      onValue(employeesRef, (empSnap) => {
        const employeesData = empSnap.val() || {};
        const today = new Date();
        let list = [];

        Object.entries(birthdaysData).forEach(([emailKey, { birthday }]) => {
          const email = emailKey.replace("_com", ".com");

          // find employee by email
          const employee = Object.values(employeesData).find(
            (emp) => emp.email === email
          );

          if (employee && birthday) {
            const [year, month, day] = birthday.split("-").map(Number);
            let next = new Date(today.getFullYear(), month - 1, day);
            if (next < today) next.setFullYear(today.getFullYear() + 1);

            const diffDays = Math.ceil(
              (next - today) / (1000 * 60 * 60 * 24)
            );

            list.push({
              id: employee.id || "N/A", 
              name: employee.name || "N/A",
              email: employee.email || "N/A",
              birthday,
              daysLeft: diffDays,
            });
          }
        });

        list.sort((a, b) => a.daysLeft - b.daysLeft);
        setBirthdays(list);
      });
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">🎂 Upcoming Birthdays</h2>
      {birthdays.length > 0 ? (
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2">Employee ID</th>
              <th className="border p-2">Name</th>
              <th className="border p-2">Email</th>
              <th className="border p-2">Birthday</th>
              <th className="border p-2">Days Left</th>
            </tr>
          </thead>
          <tbody>
            {birthdays.map((b, idx) => (
              <tr key={idx}>
                <td className="border p-2">{b.id}</td>
                <td className="border p-2">{b.name}</td>
                <td className="border p-2">{b.email}</td>
                <td className="border p-2">{b.birthday}</td>
                <td className="border p-2">{b.daysLeft}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No birthdays found.</p>
      )}
    </div>
  );
};

export default AdminBirthdays;
