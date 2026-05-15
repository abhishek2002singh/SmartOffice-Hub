import { useState, useEffect } from 'react'
import { hrApi } from '../../../api/hr.api'
import { Link } from 'react-router-dom'
import { Users, UserPlus, UserMinus, Clock, CalendarCheck, Receipt, Cake, Briefcase, TrendingDown, Building2 } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import dayjs from 'dayjs'

const DEPT_COLORS = ['#1E6FD9', '#00C6FF', '#10B981', '#FF6B00', '#EAB308', '#EF4444', '#8B5CF6']

function StatCard({ icon: Icon, label, value, sub, color, to }) {
  const inner = (
    <div className="rounded-xl p-5 flex items-start gap-4 hover:bg-white/5 transition-colors"
      style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
        <p className="text-xs text-gray-400 mt-0.5">{label}</p>
        {sub && <p className="text-xs mt-1" style={{ color }}>{sub}</p>}
      </div>
    </div>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}

function BirthdayBadge({ emp }) {
  const dob      = dayjs(emp.dob)
  const thisYear = dob.year(dayjs().year())
  const isToday  = thisYear.isSame(dayjs(), 'day')

  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: '#FF6B0020', color: '#FF6B00' }}>
        {emp.firstName[0]}
      </div>
      <div className="flex-1">
        <p className="text-sm text-white">{emp.firstName} {emp.lastName}</p>
        <p className="text-xs text-gray-500">{thisYear.format('DD MMM')}</p>
      </div>
      {isToday && <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-orange-500/20 text-orange-300">Today!</span>}
    </div>
  )
}

function ProbationRow({ emp }) {
  const daysLeft = dayjs(emp.probationEndDate).diff(dayjs(), 'day')
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <div>
        <p className="text-sm text-white">{emp.firstName} {emp.lastName}</p>
        <p className="text-xs text-gray-500">{emp.employeeCode}</p>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded font-medium ${daysLeft <= 7 ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
        {daysLeft}d left
      </span>
    </div>
  )
}

export default function HRMasterDashboardPage() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    hrApi.getHRDashboard()
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6 text-center text-gray-500 text-sm py-20">Loading HR Dashboard…</div>

  if (!data) return (
    <div className="p-6 text-center text-gray-400 py-20">Failed to load dashboard data.</div>
  )

  const deptChartData = (data.byDepartment || [])
    .filter(d => d.deptName)
    .map((d, i) => ({ name: d.deptName, value: d.count, fill: DEPT_COLORS[i % DEPT_COLORS.length] }))

  return (
    <div className="p-6 space-y-6" style={{ color: '#fff' }}>
      <div className="flex items-center gap-3">
        <Building2 size={22} style={{ color: '#1E6FD9' }} />
        <h1 className="text-xl font-bold">HR Master Dashboard</h1>
        <span className="text-xs text-gray-500">{dayjs().format('MMMM YYYY')}</span>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Users}    label="Total Employees"      value={data.totalEmployees}        color="#1E6FD9" to="/hr/employees" />
        <StatCard icon={UserPlus} label="Joined This Month"    value={data.joiningsThisMonth}     color="#10B981" />
        <StatCard icon={UserMinus}label="Exits This Month"     value={data.exitsThisMonth}        color="#EF4444"
          sub={data.attritionRate > 0 ? `${data.attritionRate}% attrition` : null} />
        <StatCard icon={Briefcase}label="Open Positions"       value={data.openCandidatePositions} color="#FF6B00" to="/hr/candidates" />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Clock}        label="Probation Ending Soon"  value={data.probationExpiringSoon?.length || 0} color="#EAB308" />
        <StatCard icon={CalendarCheck}label="Pending Leave Requests" value={data.pendingLeaveRequests}  color="#8B5CF6" to="/hr/leaves/approvals" />
        <StatCard icon={Receipt}      label="Pending Reimbursements" value={data.pendingReimbursements} color="#00C6FF" to="/hr/reimbursements" />
        <StatCard icon={Cake}         label="Birthdays This Week"    value={data.birthdaysThisWeek?.length || 0} color="#FF6B00" />
      </div>

      {/* Department breakdown + birthdays */}
      <div className="grid grid-cols-2 gap-4">
        {deptChartData.length > 0 && (
          <div className="rounded-xl p-5" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="font-semibold text-white text-sm mb-4">Headcount by Department</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={deptChartData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={10}>
                  {deptChartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Birthdays */}
        <div className="rounded-xl p-5" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="font-semibold text-white text-sm mb-3 flex items-center gap-2"><Cake size={14} style={{ color: '#FF6B00' }} /> Birthdays This Week</p>
          {(data.birthdaysThisWeek || []).length === 0
            ? <p className="text-gray-600 text-sm italic">No birthdays this week</p>
            : (data.birthdaysThisWeek || []).map(e => <BirthdayBadge key={e._id} emp={e} />)
          }
        </div>
      </div>

      {/* Probation expiring + quick links */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl p-5" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="font-semibold text-white text-sm mb-3 flex items-center gap-2"><Clock size={14} style={{ color: '#EAB308' }} /> Probation Ending in 30 Days</p>
          {(data.probationExpiringSoon || []).length === 0
            ? <p className="text-gray-600 text-sm italic">No probations expiring soon</p>
            : (data.probationExpiringSoon || []).map(e => <ProbationRow key={e._id} emp={e} />)
          }
        </div>

        <div className="rounded-xl p-5 space-y-2" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="font-semibold text-white text-sm mb-3">Quick Links</p>
          {[
            { label: 'Add New Employee',        to: '/hr/employees/onboard',   color: '#1E6FD9' },
            { label: 'View Candidates',         to: '/hr/candidates',          color: '#00C6FF' },
            { label: 'Payroll Runs',            to: '/hr/payroll',             color: '#10B981' },
            { label: 'Leave Approvals',         to: '/hr/leaves/approvals',    color: '#8B5CF6' },
            { label: 'Salary Structures',       to: '/hr/salary-structures',   color: '#FF6B00' },
            { label: 'Performance Cycles',      to: '/hr/performance-cycles',  color: '#EAB308' },
          ].map(({ label, to, color }) => (
            <Link key={to} to={to}
              className="flex items-center justify-between px-4 py-2.5 rounded-lg text-sm hover:bg-white/10 transition-colors group"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-gray-300 group-hover:text-white transition-colors">{label}</span>
              <span className="text-xs" style={{ color }}>→</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Department detail table */}
      {deptChartData.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <th className="px-4 py-3 text-left text-xs text-gray-400 font-semibold uppercase tracking-wider">Department</th>
                <th className="px-4 py-3 text-right text-xs text-gray-400 font-semibold uppercase tracking-wider">Headcount</th>
                <th className="px-4 py-3 text-right text-xs text-gray-400 font-semibold uppercase tracking-wider">% of Org</th>
              </tr>
            </thead>
            <tbody>
              {deptChartData.map((d, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                      <span className="text-white font-medium">{d.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-white font-semibold">{d.value}</td>
                  <td className="px-4 py-3 text-right text-gray-400">
                    {data.totalEmployees > 0 ? `${((d.value / data.totalEmployees) * 100).toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
              <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <td className="px-4 py-3 text-gray-400 font-semibold text-xs uppercase">Total</td>
                <td className="px-4 py-3 text-right text-white font-bold">{data.totalEmployees}</td>
                <td className="px-4 py-3 text-right text-gray-400">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
