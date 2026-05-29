import { Link, NavLink, useNavigate } from 'react-router-dom'
import { FiBriefcase, FiLogOut } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext.jsx'

const linkBase = 'px-3 py-2 text-sm font-medium rounded-md transition'
const linkInactive = 'text-slate-600 hover:text-brand-700 hover:bg-brand-50'
const linkActive = 'text-brand-700 bg-brand-50'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-brand-700">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
            <FiBriefcase />
          </span>
          Recrutify
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          <NavLink to="/" end className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            Home
          </NavLink>
          <NavLink to="/jobs" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            Jobs
          </NavLink>
          <NavLink to="/companies" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            Companies
          </NavLink>
          {user && (
            <NavLink to="/dashboard" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
              Dashboard
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden text-sm text-slate-600 sm:inline">
                Hi, {user.full_name.split(' ')[0]}
              </span>
              <button onClick={handleLogout} className="btn-secondary" title="Log out">
                <FiLogOut /> <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary">Log in</Link>
              <Link to="/register" className="btn-primary">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
