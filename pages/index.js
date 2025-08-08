"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="flex  flex-col items-center justify-center bg-gray-100 p-8">
      <h1 className="text-4xl font-bold mb-6 text-center">Welcome to the Admin System</h1>

      <div className="flex flex-col sm:flex-row gap-6">
        <Link
          href="/admin/auth"
          className="bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg hover:bg-blue-700 transition"
        >
          Go to Admin Panel
        </Link>

        <Link
          href="/employee/login"
          className="bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg hover:bg-green-700 transition"
        >
          Go to Employee Panel
        </Link>
      </div>
    </main>
  );
}
