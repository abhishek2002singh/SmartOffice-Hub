import { NavLink } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  LayoutDashboard, Users, Building2, Settings, ChevronRight,
} from 'lucide-react'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, minRole: 'TEAM_MEMBER' },
  { to: '/users', label: 'Users', icon: Users, minRole: 'ADMIN' },
  { to: '/departments', label: 'Departments', icon: Building2, minRole: 'ADMIN' },
]

const ROLE_ORDER = ['TEAM_MEMBER', 'DEPT_HEAD', 'SUBADMIN', 'ADMIN', 'SUPERADMIN']

export default function Sidebar({ collapsed, onToggle }) {
  const { user } = useSelector((s) => s.auth)
  const userLevel = ROLE_ORDER.indexOf(user?.role || 'TEAM_MEMBER')

  const visibleNav = NAV.filter((item) => userLevel >= ROLE_ORDER.indexOf(item.minRole))

  return (
    <aside
      className="flex flex-col h-full transition-all duration-300 border-r"
      style={{
        width: collapsed ? '64px' : '220px',
        backgroundColor: '#0A1628',
        borderColor: 'rgba(255,255,255,0.08)',
        minHeight: '100vh',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1E6FD9' }}>
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
            <polygon points="12,2 22,20 2,20" fill="#fff" opacity="0.9" />
            <rect x="11" y="9" width="2" height="8" rx="0.5" fill="#0A1628" />
            <polygon points="12,5 15,11 9,11" fill="#0A1628" />
          </svg>
        </div>
        {!collapsed && (
          <div>
            <p className="text-white font-bold text-sm leading-none">AMS</p>
            <p className="text-xs leading-none mt-0.5" style={{ color: '#00C6FF' }}>ANK Digital</p>
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {visibleNav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
            style={({ isActive }) => isActive ? { backgroundColor: '#1E6FD9' } : {}}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center py-4 border-t text-gray-500 hover:text-white transition-colors"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <ChevronRight size={16} className={`transition-transform ${collapsed ? '' : 'rotate-180'}`} />
      </button>
    </aside>
  )
}
