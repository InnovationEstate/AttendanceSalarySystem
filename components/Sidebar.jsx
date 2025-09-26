// components/Sidebar.js
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  HomeIcon,
  Users,
  CalendarCheck,
  IndianRupee,
  MenuIcon,
  XIcon,
  FileTextIcon
} from 'lucide-react'

const adminNavItems = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: <HomeIcon className="w-5 h-5" /> },
  { name: 'Employees', href: '/admin/employee', icon: <Users className="w-5 h-5" /> },
  { name: 'Attendance', href: '/admin/attendance', icon: <CalendarCheck className="w-5 h-5" /> },
  { name: 'Salary', href: '/admin/salary', icon: <IndianRupee className="w-5 h-5" /> },
  { name: 'Documents', href: '/admin/documents', icon: <FileTextIcon className="w-5 h-5" /> },
  { name: 'Leave Requests', href: '/admin/ManageLeaves', icon: <CalendarCheck className="w-5 h-5" /> },
  { name: 'Company Holidays', href: '/admin/companyHolidays', icon: <CalendarCheck className="w-5 h-5" /> },
  { name: 'Birthdays', href: '/admin/birthdays', icon: <CalendarCheck className="w-5 h-5" /> },
  { name: 'Weekoff', href: '/admin/weekoff', icon: <CalendarCheck className="w-5 h-5" /> },
  { name: 'Previous Employees', href: '/admin/PreviousEmployees', icon: <Users className="w-5 h-5" /> },
  { name: 'Logout', href: '/admin/logout', icon: <XIcon className="w-5 h-5" /> },
]

const employeeNavItems = [
  { name: 'Dashboard', href: '/employee/dashboard', icon: <HomeIcon className="w-5 h-5" /> },
  { name: 'Attendance', href: '/employee/attendance', icon: <CalendarCheck className="w-5 h-5" /> },
  { name: 'Salary', href: '/employee/salary', icon: <IndianRupee className="w-5 h-5" /> },
  { name: 'Documents', href: '/employee/documents', icon: <FileTextIcon className="w-5 h-5" /> },
  { name: 'Leave Requests', href: '/employee/ApplyLeave', icon: <CalendarCheck className="w-5 h-5" /> },
  { name: 'Profile', href: '/employee/profile', icon: <Users className="w-5 h-5" /> },
  { name: 'Logout', href: '/employee/logout', icon: <XIcon className="w-5 h-5" /> },
]

export default function Sidebar({ role }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const navItems =
    role === 'admin' ? adminNavItems : role === 'employee' ? employeeNavItems : []

  useEffect(() => {
    const handleRouteChange = () => setIsOpen(false)
    router.events.on('routeChangeStart', handleRouteChange)
    return () => {
      router.events.off('routeChangeStart', handleRouteChange)
    }
  }, [router.events])

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-blue-600 text-white sm:hidden"
      >
        <MenuIcon className="w-6 h-6" />
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 max-w-[80%] bg-blue-600 z-50
          flex flex-col transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
          sm:translate-x-0 sm:static
        `}
      >
        {/* Mobile Header */}
        <div className="flex justify-between items-center p-4 sm:hidden shrink-0">
          <h1 className="text-white text-xl font-bold">Innovation Estate</h1>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-md bg-blue-700 hover:bg-blue-800 text-white"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Desktop Logo */}
        <div className="hidden sm:flex justify-center p-4 shrink-0">
          <Image src="/innovation-logo.webp" alt="Logo" width={150} height={150} />
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 space-y-1">
          {navItems.map(item => {
            const isActive = router.pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors
                  ${isActive
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-white hover:bg-blue-500 hover:text-white'}
                `}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer (Sticky) */}
        <div className="sticky pl-5 bottom-3 border-t border-blue-400 text-white text-md shrink-0">
          Logged in as <strong>{role === 'admin' ? 'Admin' : 'Employee'}</strong>
        </div>
      </aside>
    </>
  )
}
