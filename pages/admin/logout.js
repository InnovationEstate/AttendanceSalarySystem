// pages/admin/logout.jsx
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function AdminLogout() {
  const router = useRouter();

  useEffect(() => {
    // Clear all storages
    localStorage.clear();
    sessionStorage.clear();

    // Redirect to home
    router.replace("/");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-lg font-medium">Logging out...</p>
    </div>
  );
}
