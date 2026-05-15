import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  Target, Handshake, Users, FolderKanban, BookOpen, Bug,
  Palette, TrendingUp, CheckSquare, DollarSign, AlertTriangle,
  Calendar, RefreshCw, Activity, Clock
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { getMasterDashboard } from '../api/dashboard.api'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const STAGE_LABELS = {
  new: 'New', assigned: 'Assigned', contacted: 'Contacted',
  qualified: 'Qualified', proposal: 'Proposal', negotiation: 'Negotiation',
  won: 'Won', lost: 'Lost', junk: 'Junk',
}
const STAGE_COLORS = {
  new: '#64748b', assigned: '#3b82f6', contacted: '#06b6d4',
  qualified: '#8b5cf6', proposal: '#f59e0b', negotiation: '#f97316',
  won: '#22c55e', lost: '#ef4444', junk: '#6b7280',
}
const AUDIT_ACTION_COLOR = { CREATE: '#22c55e', UPDATE: '#3b82f6', DELETE: '#ef4444' }

function StatCard({ icon: Icon, label, value, sub, color, onClick }) {
  return (
    <div
      className={`rounded-2xl p-5 flex items-start gap-4 border transition-all ${onClick ? 'cursor-pointer hover:border-white/20' : ''}`}
      style={{ backgroundColor: '#112044', borderColor: 'rgba(255,255,255,0.08)' }}
      onClick={onClick}
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-white leading-none">{value ?? '—'}</p>
        <p className="text-sm text-gray-400 mt-1">{label}</p>
        {sub && <p className="text-xs mt-1" style={{ color }}>{sub}</p>}
      </div>
    </div>
  )
}

function SectionHeader({ title, icon: Icon, color }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-6">
      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
        <Icon size={13} style={{ color }} />
      </div>
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{title}</h2>
    </div>
  )
}

export default function MasterDashboardPage() {
  const navigate  = useNavigate()
  const { user }  = useSelector(s => s.auth)
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const d = await getMasterDashboard()
      setData(d)
      setLastRefresh(new Date())
      setError('')
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Failed to load dashboard')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Loading master dashboard…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: '#112044' }}>
      <AlertTriangle size={32} className="mx-auto mb-2 text-red-400" />
      <p className="text-red-400">{error}</p>
      <button onClick={load} className="mt-3 text-sm text-blue-400 hover:text-blue-300">Retry</button>
    </div>
  )

  if (!data) return null

  const { crm, hr, dev, gd, sops, recentActivity } = data

  // Pipeline chart data
  const pipelineData = Object.entries(crm.stageBreakdown || {})
    .filter(([s]) => !['won', 'lost', 'junk'].includes(s))
    .map(([stage, count]) => ({ name: STAGE_LABELS[stage] || stage, count, fill: STAGE_COLORS[stage] || '#888' }))

  // Bug severity — use open bugs count as a simple display
  const devSummaryData = [
    { name: 'Active Projects', value: dev.activeProjects, fill: '#1E6FD9' },
    { name: 'Completed', value: dev.completedProjects, fill: '#22c55e' },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Master Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {lastRefresh ? `Last updated ${dayjs(lastRefresh).fromNow()}` : 'Loading…'}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-gray-300 hover:text-white transition-colors"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ── CRM ── */}
      <SectionHeader title="CRM & Sales" icon={Target} color="#FF6B00" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Target}    label="Total Leads"       value={crm.totalLeads}        color="#FF6B00" onClick={() => navigate('/crm/leads')} />
        <StatCard icon={TrendingUp} label="New This Month"   value={crm.newLeadsThisMonth}  color="#00C6FF" sub={`${crm.wonLeadsThisMonth} won`} />
        <StatCard icon={Handshake}  label="Active Clients"   value={crm.activeClients}      color="#22c55e" onClick={() => navigate('/crm/clients')} />
        <StatCard icon={DollarSign} label="Pipeline Value"   value={`₹${(crm.pipelineValue || 0).toLocaleString('en-IN')}`} color="#A78BFA" />
      </div>

      {/* Pipeline Chart */}
      {pipelineData.length > 0 && (
        <div className="mt-4 rounded-2xl p-5 border" style={{ backgroundColor: '#112044', borderColor: 'rgba(255,255,255,0.08)' }}>
          <p className="text-sm font-semibold text-gray-300 mb-3">Lead Pipeline</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={pipelineData} barSize={24}>
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a2f5e', border: 'none', borderRadius: '12px', color: '#fff' }}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {pipelineData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── HR ── */}
      <SectionHeader title="Human Resources" icon={Users} color="#34D399" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}      label="Total Employees"     value={hr.totalEmployees}        color="#34D399" onClick={() => navigate('/hr/employees')} />
        <StatCard icon={Calendar}   label="Joining This Month"  value={hr.joiningThisMonth}      color="#00C6FF" />
        <StatCard icon={CheckSquare} label="Pending Leaves"     value={hr.pendingLeaveRequests}  color="#F59E0B" onClick={() => navigate('/hr/leaves/approvals')} />
        <StatCard icon={DollarSign}  label="Pending Reimbursements" value={hr.pendingReimbursements} color="#A78BFA" onClick={() => navigate('/hr/reimbursements')} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-2xl p-5 border flex items-center gap-4" style={{ backgroundColor: '#112044', borderColor: 'rgba(255,255,255,0.08)' }}>
          <Activity size={20} className="text-green-400 flex-shrink-0" />
          <div>
            <p className="text-2xl font-bold text-white">{hr.attendanceToday}</p>
            <p className="text-sm text-gray-400">Checked in today</p>
          </div>
        </div>
        <div className="rounded-2xl p-5 border flex items-center gap-4" style={{ backgroundColor: '#112044', borderColor: 'rgba(255,255,255,0.08)' }}>
          <Users size={20} className="text-blue-400 flex-shrink-0" />
          <div>
            <p className="text-2xl font-bold text-white">{hr.confirmedEmployees}</p>
            <p className="text-sm text-gray-400">Confirmed employees</p>
          </div>
        </div>
      </div>

      {/* ── Dev + GD ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
        <div>
          <SectionHeader title="Development" icon={FolderKanban} color="#1E6FD9" />
          <div className="grid grid-cols-2 gap-4">
            <StatCard icon={FolderKanban} label="Active Projects" value={dev.activeProjects}  color="#1E6FD9" onClick={() => navigate('/dev/projects')} />
            <StatCard icon={Bug}          label="Open Bugs"       value={dev.openBugs}        color="#F87171"
              sub={dev.criticalBugs > 0 ? `${dev.criticalBugs} critical` : undefined} />
          </div>
          {devSummaryData.some(d => d.value > 0) && (
            <div className="mt-3 rounded-2xl p-4 border" style={{ backgroundColor: '#112044', borderColor: 'rgba(255,255,255,0.08)' }}>
              <ResponsiveContainer width="100%" height={100}>
                <PieChart>
                  <Pie data={devSummaryData} dataKey="value" cx="50%" cy="50%" outerRadius={40} paddingAngle={3}>
                    {devSummaryData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1a2f5e', border: 'none', borderRadius: '12px', color: '#fff' }} />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div>
          <SectionHeader title="Graphic & Design" icon={Palette} color="#A78BFA" />
          <div className="grid grid-cols-2 gap-4">
            <StatCard icon={Palette}    label="Pending Tasks"     value={gd.pendingTasks}    color="#A78BFA" onClick={() => navigate('/gd/tasks')} />
            <StatCard icon={Activity}   label="In Progress"       value={gd.inProgressTasks} color="#F59E0B" />
          </div>
        </div>
      </div>

      {/* ── SOPs ── */}
      <SectionHeader title="SOPs & Compliance" icon={BookOpen} color="#F59E0B" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen}      label="Published SOPs"       value={sops.published}            color="#F59E0B" onClick={() => navigate('/sops')} />
        <StatCard icon={CheckSquare}   label="Pending Approvals"    value={sops.pendingApprovals}     color="#FF6B00" onClick={() => navigate('/sops/approvals')} />
        <StatCard icon={AlertTriangle} label="Mandatory SOPs"       value={sops.mandatorySOPs}        color="#EF4444" />
        <StatCard icon={Users}         label="Acknowledgements"     value={sops.totalAcknowledgements} color="#34D399" onClick={() => navigate('/sops/ack-matrix')} />
      </div>

      {/* ── Recent Activity ── */}
      {recentActivity?.length > 0 && (
        <>
          <SectionHeader title="Recent Activity" icon={Clock} color="#00C6FF" />
          <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: '#112044', borderColor: 'rgba(255,255,255,0.08)' }}>
            {recentActivity.map((log, i) => (
              <div
                key={log._id || i}
                className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}
              >
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: `${AUDIT_ACTION_COLOR[log.action] || '#888'}20`, color: AUDIT_ACTION_COLOR[log.action] || '#888' }}
                >
                  {log.action}
                </span>
                <p className="text-sm text-gray-300 flex-1 min-w-0 truncate">
                  <span className="text-white font-medium capitalize">{log.resource?.replace(/_/g, ' ')}</span>
                </p>
                <p className="text-xs text-gray-600 flex-shrink-0">{dayjs(log.createdAt).fromNow()}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-8 pb-2 text-center text-xs text-gray-700">
        AMS Master Dashboard · ANK Digital Media · {dayjs(data.generatedAt).format('DD MMM YYYY, HH:mm')}
      </div>
    </div>
  )
}
