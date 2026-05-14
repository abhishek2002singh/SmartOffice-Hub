import { NavLink } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { LayoutDashboard, Users, Building2, Shield, Settings, ScrollText, UserCircle, ChevronRight, Target, Handshake, PieChart, BarChart2, MonitorCheck, Megaphone, SlidersHorizontal, FileText, Palette, Inbox, ImageIcon, Layers, Code2, FolderKanban, MailOpen, UserSearch, XCircle, Upload, UserCheck, UsersRound, CalendarDays, Palmtree, CheckSquare, Activity, CalendarRange, DollarSign, Banknote, Receipt, Gift } from 'lucide-react'

const ROLE_ORDER = ['TEAM_MEMBER', 'DEPT_HEAD', 'SUBADMIN', 'ADMIN', 'SUPERADMIN']

const NAV_SECTIONS = [
  {
    label: 'Core',
    items: [
      { to: '/dashboard',   label: 'Dashboard',  icon: LayoutDashboard, minRole: 'TEAM_MEMBER' },
      { to: '/users',       label: 'Users',       icon: Users,           minRole: 'ADMIN' },
      { to: '/departments', label: 'Departments', icon: Building2,       minRole: 'ADMIN' },
      { to: '/permissions', label: 'Permissions', icon: Shield,          minRole: 'SUPERADMIN' },
      { to: '/audit-logs',  label: 'Audit Logs',  icon: ScrollText,      minRole: 'SUPERADMIN' },
      { to: '/settings',    label: 'Settings',    icon: Settings,        minRole: 'ADMIN' },
      { to: '/profile',     label: 'My Profile',  icon: UserCircle,      minRole: 'TEAM_MEMBER' },
    ],
  },
  {
    label: 'CRM',
    items: [
      { to: '/crm/dashboard', label: 'Dashboard', icon: PieChart,    minRole: 'TEAM_MEMBER' },
      { to: '/crm/leads',     label: 'Leads',     icon: Target,      minRole: 'TEAM_MEMBER' },
      { to: '/crm/clients',   label: 'Clients',   icon: Handshake,   minRole: 'TEAM_MEMBER' },
      { to: '/crm/reports',   label: 'Reports',   icon: BarChart2,   minRole: 'SUBADMIN' },
    ],
  },
  {
    label: 'Digital Marketing',
    items: [
      { to: '/dm/daily',         label: 'Daily Tasks',     icon: MonitorCheck,       minRole: 'TEAM_MEMBER' },
      { to: '/dm/audit-reports', label: 'Audit Reports',   icon: FileText,           minRole: 'TEAM_MEMBER' },
      { to: '/dm/gd-queue',      label: 'GD Work Queue',   icon: Layers,             minRole: 'TEAM_MEMBER' },
      { to: '/dm/head',          label: 'Team Overview',   icon: Megaphone,          minRole: 'DEPT_HEAD' },
      { to: '/dm/config',        label: 'Platform Config', icon: SlidersHorizontal,  minRole: 'ADMIN' },
    ],
  },
  {
    label: 'Graphic & Video',
    items: [
      { to: '/gd/dashboard',  label: 'My Dashboard',  icon: Palette,    minRole: 'TEAM_MEMBER' },
      { to: '/gd/tasks',      label: 'Task Inbox',    icon: Inbox,      minRole: 'TEAM_MEMBER' },
      { to: '/gd/head',       label: 'Team Overview', icon: ImageIcon,  minRole: 'DEPT_HEAD' },
    ],
  },
  {
    label: 'HR',
    items: [
      { to: '/hr/employees',           label: 'Employees',        icon: UsersRound,  minRole: 'DEPT_HEAD' },
      { to: '/hr/candidates',          label: 'Candidates',       icon: UserSearch,  minRole: 'DEPT_HEAD' },
      { to: '/hr/attendance/me',       label: 'My Attendance',    icon: CalendarDays,minRole: 'TEAM_MEMBER' },
      { to: '/hr/leaves/me',           label: 'My Leaves',        icon: Palmtree,    minRole: 'TEAM_MEMBER' },
      { to: '/hr/leaves/approvals',    label: 'Leave Approvals',  icon: CheckSquare, minRole: 'DEPT_HEAD' },
      { to: '/hr/attendance',          label: 'Attendance Log',   icon: Activity,    minRole: 'DEPT_HEAD' },
      { to: '/hr/holidays',            label: 'Holiday Calendar', icon: CalendarRange,minRole: 'ADMIN' },
      { to: '/hr/leave-types',         label: 'Leave Types',      icon: Settings,    minRole: 'ADMIN' },
      { to: '/hr/candidates/rejected', label: 'Rejected Pool',    icon: XCircle,     minRole: 'DEPT_HEAD' },
      { to: '/hr/candidates/import',   label: 'Bulk Import',      icon: Upload,      minRole: 'DEPT_HEAD' },
      { to: '/hr/me',                  label: 'My HR Profile',    icon: UserCheck,   minRole: 'TEAM_MEMBER' },
      { to: '/hr/me/payslips',         label: 'My Payslips',      icon: FileText,    minRole: 'TEAM_MEMBER' },
      { to: '/hr/reimbursements',      label: 'Reimbursements',   icon: Receipt,     minRole: 'TEAM_MEMBER' },
      { to: '/hr/payroll',             label: 'Payroll Runs',     icon: Banknote,    minRole: 'ADMIN' },
      { to: '/hr/salary-structures',   label: 'Salary Structures',icon: DollarSign,  minRole: 'ADMIN' },
      { to: '/hr/bonuses',             label: 'Bonuses',          icon: Gift,        minRole: 'ADMIN' },
    ],
  },
  {
    label: 'Development',
    items: [
      { to: '/dev/dashboard',  label: 'My Dashboard',    icon: LayoutDashboard, minRole: 'TEAM_MEMBER' },
      { to: '/dev/projects',   label: 'Projects',        icon: FolderKanban,    minRole: 'TEAM_MEMBER' },
      { to: '/dev/head',       label: 'Team Overview',   icon: Code2,           minRole: 'DEPT_HEAD' },
      { to: '/dev/handovers',  label: 'Handover Inbox',  icon: MailOpen,        minRole: 'DEPT_HEAD' },
    ],
  },
]

export default function Sidebar({ collapsed, onToggle }) {
  const { user } = useSelector((s) => s.auth)
  const userLevel = ROLE_ORDER.indexOf(user?.role || 'TEAM_MEMBER')

  return (
    <aside
      className="flex flex-col shrink-0 h-full transition-all duration-300 border-r"
      style={{ width: collapsed ? '64px' : '220px', backgroundColor: '#0A1628', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1E6FD9' }}>
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
            <polygon points="12,2 22,20 2,20" fill="#fff" opacity="0.9" />
            <rect x="11" y="9" width="2" height="8" rx="0.5" fill="#1E6FD9" />
            <polygon points="12,5 15,11 9,11" fill="#1E6FD9" />
          </svg>
        </div>
        {!collapsed && (
          <div>
            <p className="text-white font-bold text-sm leading-none">AMS</p>
            <p className="text-xs leading-none mt-0.5" style={{ color: '#00C6FF' }}>ANK Digital</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV_SECTIONS.map((section) => {
          const visible = section.items.filter((item) => userLevel >= ROLE_ORDER.indexOf(item.minRole))
          if (!visible.length) return null
          return (
            <div key={section.label} className="mb-2">
              {!collapsed && (
                <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5 px-2">
                {visible.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isActive ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`
                    }
                    style={({ isActive }) => isActive ? { backgroundColor: '#1E6FD9' } : {}}
                  >
                    <Icon size={18} className="shrink-0" />
                    {!collapsed && <span>{label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center py-4 border-t text-gray-500 hover:text-white transition-colors"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <ChevronRight size={16} className={`transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`} />
      </button>
    </aside>
  )
}
