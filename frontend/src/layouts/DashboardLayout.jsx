import { NavLink, Outlet } from 'react-router-dom'
import { FiHome, FiUser, FiSend, FiBookmark, FiFileText, FiBriefcase, FiUsers, FiZap, FiShield } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext.jsx'

const SEEKER_NAV = [
  { to: '/dashboard', label: 'Overview', icon: FiHome, end: true },
  { to: '/dashboard/profile', label: 'Profile', icon: FiUser },
  { to: '/dashboard/resume', label: 'Resume', icon: FiFileText },
  { to: '/dashboard/recommendations', label: 'AI matches', icon: FiZap },
  { to: '/dashboard/applications', label: 'Applications', icon: FiSend },
  { to: '/dashboard/saved', label: 'Saved jobs', icon: FiBookmark },
]

const EMPLOYER_NAV = [
  { to: '/dashboard', label: 'Overview', icon: FiHome, end: true },
  { to: '/dashboard/profile', label: 'Profile', icon: FiUser },
  { to: '/dashboard/company', label: 'Company', icon: FiBriefcase },
  { to: '/dashboard/jobs', label: 'Posted jobs', icon: FiFileText },
]

const ADMIN_NAV = [
  { to: '/dashboard', label: 'Overview', icon: FiHome, end: true },
  { to: '/dashboard/profile', label: 'Profile', icon: FiUser },
  { to: '/dashboard/admin/users', label: 'Users', icon: FiUsers },
  { to: '/dashboard/admin/companies', label: 'Companies', icon: FiBriefcase },
  { to: '/dashboard/admin/jobs', label: 'Jobs', icon: FiShield },
]

export default function DashboardLayout() {
  const { user } = useAuth()
  const nav =
    user.role === 'job_seeker' ? SEEKER_NAV : user.role === 'employer' ? EMPLOYER_NAV : ADMIN_NAV

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <nav className="card flex flex-row gap-1 overflow-x-auto p-2 lg:flex-col">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-brand-700'
                  }`
                }
              >
                <item.icon /> {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
