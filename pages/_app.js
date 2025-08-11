import '../styles/globals.css';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [role, setRole] = useState(null);
  const [authorized, setAuthorized] = useState(false);
  const [firstVisit, setFirstVisit] = useState(true); // ⬅️ NEW: Track first-time visit

  useEffect(() => {
    const queryRole = router.query.role;
    const pathname = router.pathname;
    const isAdmin = typeof window !== 'undefined' && sessionStorage.getItem('isAdmin') === 'true';

    // ⬇️ Only get role from query param, not localStorage on first visit
    if (queryRole === 'admin' || queryRole === 'employee') {
      setRole(queryRole);
      localStorage.setItem('userRole', queryRole);
      setFirstVisit(false); // Now allow future visits to use localStorage
    } else if (!firstVisit) {
      const savedRole = localStorage.getItem('userRole');
      if (savedRole === 'admin' || savedRole === 'employee') {
        setRole(savedRole);
      }
    }

    // Default behavior if no role is known
    if (!queryRole && !localStorage.getItem('userRole')) {
      setRole(null); // No role set until login
    }

    // Also set role based on path
    if (pathname.startsWith('/admin')) setRole('admin');
    if (pathname.startsWith('/employee')) setRole('employee');
  }, [router.query.role, router.pathname, firstVisit]);

  useEffect(() => {
    const isAdmin = typeof window !== 'undefined' && sessionStorage.getItem('isAdmin') === 'true';
    const role = localStorage.getItem('userRole');
    const path = router.pathname;

    const isAdminRoute = path.startsWith('/admin');
    const isEmployeeRoute = path.startsWith('/employee');

    // 🔐 Protect Admin Routes
    if (isAdminRoute) {
      if (!isAdmin && path !== '/admin/auth') {
        setAuthorized(false);
        router.replace('/admin/auth');
        return;
      }

      if (role === 'employee') {
        setAuthorized(false);
        router.replace('/unauthorized');
        return;
      }
    }

    // 🔐 Protect Employee Routes
    if (isEmployeeRoute && role === 'admin') {
      setAuthorized(false);
      router.replace('/unauthorized');
      return;
    }

    setAuthorized(true);
  }, [router.pathname]);

  // ⏳ Still resolving role or unauthorized
  if (!authorized && router.pathname.startsWith('/admin')) {
    return <div className="p-6">Loading...</div>;
  }

 return (
    <div className="flex">
      {/* Only show Sidebar if authorized and role is confirmed */}
      {authorized && role && <Sidebar role={role} />}

      {/* Main content beside Sidebar */}
      <div className="flex flex-col flex-1 h-screen overflow-hidden pl-0 bg-gray-50">
        {/* Header */}
        <header className="top-0 sticky bg-blue-700 text-white p-4 flex items-center justify-center sm:justify-start shadow">
          <h1 className="text-xl font-bold pl-5">Attendance & Salary System</h1>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Component {...pageProps} role={role} />
        </main>

        {/* Footer */}
        <footer className=" bottom-0 sticky bg-gray-200 text-center text-sm text-gray-600 p-4">
          &copy; 2025 Innovation Estate. All rights reserved.
        </footer>
      </div>
    </div>
  );

}
