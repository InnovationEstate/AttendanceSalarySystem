import '../styles/globals.css';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';

export default function App({ Component, pageProps }) {
  const router = useRouter();

  // Extract stable variables for dependencies
  const pathname = router.pathname;
  const queryRole = router.query.role ?? null;

  const [role, setRole] = useState(null);
  const [authorized, setAuthorized] = useState(false);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return; // only run on client

    let storedRole = localStorage.getItem('userRole');

    if (queryRole === 'admin' || queryRole === 'employee') {
      setRole(queryRole);
      localStorage.setItem('userRole', queryRole);
      storedRole = queryRole;
    } else if (storedRole !== 'admin' && storedRole !== 'employee') {
      if (pathname.startsWith('/admin')) storedRole = 'admin';
      else if (pathname.startsWith('/employee')) storedRole = 'employee';
      else storedRole = null;

      if (storedRole) {
        setRole(storedRole);
        localStorage.setItem('userRole', storedRole);
      } else {
        setRole(null);
        localStorage.removeItem('userRole');
      }
    } else {
      setRole(storedRole);
    }

    setLoadingRole(false);
  }, [queryRole, pathname]);

  useEffect(() => {
    if (loadingRole) return; // wait for role to load
    if (typeof window === 'undefined') return;

    const isAdminRoute = pathname.startsWith('/admin');
    const isEmployeeRoute = pathname.startsWith('/employee');

    const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
    const isEmployeeLoggedIn = sessionStorage.getItem('isEmployeeLoggedIn') === 'true';

    const storedRole = localStorage.getItem('userRole');

    if (isAdminRoute) {
      if (!isAdmin && pathname !== '/admin/auth') {
        setAuthorized(false);
        router.replace('/admin/auth');
        return;
      }
      if (storedRole === 'employee') {
        setAuthorized(false);
        router.replace('/unauthorized');
        return;
      }
    }

    if (isEmployeeRoute) {
      if (!isEmployeeLoggedIn && pathname !== '/employee/login') {
        setAuthorized(false);
        router.replace('/employee/login');
        return;
      }
      if (storedRole === 'admin') {
        setAuthorized(false);
        router.replace('/unauthorized');
        return;
      }
    }

    setAuthorized(true);
  }, [pathname, loadingRole, router]);

  if (
    loadingRole ||
    (!authorized && (pathname.startsWith('/admin') || pathname.startsWith('/employee')))
  ) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="flex">
      {authorized && role && <Sidebar role={role} />}

      <div className="flex flex-col flex-1 h-screen overflow-hidden pl-0 bg-gray-50">
        <header className="top-0 sticky bg-blue-700 text-white p-4 flex items-center justify-center sm:justify-start shadow">
          <h1 className="text-xl font-bold pl-5">Attendance & Salary System</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Component {...pageProps} role={role} />
        </main>

        <footer className="bottom-0 sticky bg-gray-200 text-center text-sm text-gray-600 p-4">
          &copy; 2025 Innovation Estate. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
