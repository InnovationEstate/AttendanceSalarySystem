import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Unauthorized() {
  const [role, setRole] = useState(null);

  useEffect(() => {
    const storedRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
    setRole(storedRole);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-6 text-center">
      <h1 className="text-4xl font-bold text-red-600 mb-4">Access Denied</h1>
      <p className="text-lg text-gray-700 mb-6">
        {role === 'admin' && 'You are logged in as an admin and cannot access employee pages.'}
        {role === 'employee' && 'You are logged in as an employee and cannot access admin pages.'}
        {!role && 'You do not have permission to access this page.'}
      </p>

      <div className="flex gap-4">
        <Link href="/">
          <span className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg shadow transition duration-200">
            Go to Home
          </span>
        </Link>

        {role !== 'admin' && (
          <Link href="/admin/auth">
            <span className="bg-gray-600 hover:bg-gray-700 text-white px-5 py-2 rounded-lg shadow transition duration-200">
              Admin Login
            </span>
          </Link>
        )}

        {role !== 'employee' && (
          <Link href="/employee/login">
            <span className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg shadow transition duration-200">
              Employee Login
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
