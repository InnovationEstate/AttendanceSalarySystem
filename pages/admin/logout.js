// pages/admin/logout.jsx
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function AdminLogout() {
  const router = useRouter();

  useEffect(() => {
    // 1️⃣ Clear local storage
    localStorage.clear(); // or remove specific keys: localStorage.removeItem("adminId");

    // 2️⃣ Redirect to main/login page after clearing
    router.replace("/"); // "/" is your main page, change if needed
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-lg font-medium">Logging out...</p>
    </div>
  );
}
