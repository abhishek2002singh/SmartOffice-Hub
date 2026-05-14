import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { devApi } from '../../../api/dev.api'

const PROJECT_STATUS_CONFIG = {
  planning:    { label: 'Planning',    color: 'bg-blue-900/40 text-blue-300',    dot: 'bg-blue-400' },
  active:      { label: 'Active',      color: 'bg-green-900/30 text-green-300',  dot: 'bg-green-400' },
  on_hold:     { label: 'On Hold',     color: 'bg-yellow-900/30 text-yellow-300', dot: 'bg-yellow-400' },
  completed:   { label: 'Completed',   color: 'bg-gray-700 text-gray-300',       dot: 'bg-gray-400' },
  maintenance: { label: 'Maintenance', color: 'bg-purple-900/30 text-purple-300', dot: 'bg-purple-400' },
  cancelled:   { label: 'Cancelled',   color: 'bg-red-900/30 text-red-300',      dot: 'bg-red-400' },
}

const BUG_SEVERITY_CONFIG = {
  blocker:  { label: 'Blocker',  color: 'bg-red-900 text-red-300',       bar: 'bg-red-500' },
  critical: { label: 'Critical', color: 'bg-orange-900/40 text-orange-300', bar: 'bg-orange-500' },
  major:    { label: 'Major',    color: 'bg-yellow-900/30 text-yellow-300', bar: 'bg-yellow-500' },
  minor:    { label: 'Minor',    color: 'bg-blue-900/40 text-blue-300',   bar: 'bg-blue-500' },
  cosmetic: { label: 'Cosmetic', color: 'bg-gray-700 text-gray-300',      bar: 'bg-gray-500' },
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-[#1A3A6B] rounded-2xl p-5">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${accent || 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

export default function DevHeadDashboardPage() {
  const navigate = useNavigate()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    devApi.headDashboard()
      .then(r => setData(r.data.data))
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>
  if (error)   return <div className="text-red-400 text-center py-8">{error}</div>
  if (!data)   return null

  const {
    projectCounts = {},
    teamWorkload = [],
    bugCounts = {},
    overdueTaskCount = 0,
    recentProjects = [],
  } = data

  const totalProjects = Object.values(projectCounts).reduce((s, n) => s + n, 0)
  const totalBugs     = Object.values(bugCounts).reduce((s, n) => s + n, 0)
  const maxWorkload   = Math.max(...teamWorkload.map(t => t.taskCount), 1)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dev Head Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Team overview, project status, and bug tracker</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Projects"  value={totalProjects}        sub="all statuses"    accent="text-[#00C6FF]" />
        <StatCard label="Active Projects" value={projectCounts.active || 0} sub="currently active" accent="text-green-400" />
        <StatCard label="Overdue Tasks"   value={overdueTaskCount}     sub="across all projects" accent={overdueTaskCount > 0 ? 'text-red-400' : 'text-white'} />
        <StatCard label="Open Bugs"       value={totalBugs}            sub="active issues"   accent={totalBugs > 0 ? 'text-orange-400' : 'text-white'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project status breakdown */}
        <div className="bg-[#0A1628] border border-blue-900 rounded-2xl p-5">
          <h2 className="text-base font-semibold text-white mb-4">Projects by Status</h2>
          <div className="space-y-3">
            {Object.entries(PROJECT_STATUS_CONFIG).map(([key, cfg]) => {
              const count = projectCounts[key] || 0
              const pct   = totalProjects > 0 ? Math.round((count / totalProjects) * 100) : 0
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <span className="text-sm text-gray-300">{cfg.label}</span>
                    </div>
                    <span className="text-sm text-white font-medium">{count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${cfg.dot}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bug severity breakdown */}
        <div className="bg-[#0A1628] border border-blue-900 rounded-2xl p-5">
          <h2 className="text-base font-semibold text-white mb-4">Open Bugs by Severity</h2>
          {totalBugs === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No active bugs. Clean slate!</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(BUG_SEVERITY_CONFIG).map(([key, cfg]) => {
                const count = bugCounts[key] || 0
                const pct   = totalBugs > 0 ? Math.round((count / totalBugs) * 100) : 0
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-sm text-white font-medium">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Team workload */}
        <div className="bg-[#0A1628] border border-blue-900 rounded-2xl p-5">
          <h2 className="text-base font-semibold text-white mb-4">Team Workload</h2>
          {teamWorkload.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No active tasks assigned.</p>
          ) : (
            <div className="space-y-3">
              {teamWorkload.map((member, i) => {
                const pct = Math.round((member.taskCount / maxWorkload) * 100)
                const isHeavy = member.taskCount >= 8
                return (
                  <div key={member._id || i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#1E6FD9] flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {member.user?.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="text-sm text-gray-300 truncate">{member.user?.name || 'Unknown'}</span>
                      </div>
                      <span className={`text-sm font-medium ${isHeavy ? 'text-orange-400' : 'text-white'}`}>
                        {member.taskCount}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isHeavy ? 'bg-orange-500' : 'bg-[#1E6FD9]'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent / active projects */}
      <div className="bg-[#0A1628] border border-blue-900 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Active & Planning Projects</h2>
          <button onClick={() => navigate('/dev/projects')} className="text-xs text-[#1E6FD9] hover:text-[#00C6FF]">
            View all →
          </button>
        </div>

        {recentProjects.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No active projects.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-blue-900">
                  <th className="text-left py-2 pr-4">Project</th>
                  <th className="text-left py-2 pr-4">Client</th>
                  <th className="text-left py-2 pr-4">Status</th>
                  <th className="text-left py-2 pr-4">PM</th>
                  <th className="text-left py-2">Lead Dev</th>
                </tr>
              </thead>
              <tbody>
                {recentProjects.map(p => {
                  const cfg = PROJECT_STATUS_CONFIG[p.status] || {}
                  return (
                    <tr
                      key={p._id}
                      className="border-b border-blue-900/30 hover:bg-white/5 cursor-pointer"
                      onClick={() => navigate(`/dev/projects/${p._id}`)}
                    >
                      <td className="py-2.5 pr-4">
                        <p className="text-gray-200 font-medium">{p.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{p.type?.replace('_', ' ')}</p>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-400 text-xs">
                        {p.clientId?.companyName || p.clientId?.name || '—'}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.color || ''}`}>
                          {cfg.label || p.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-400 text-xs">{p.projectManager?.name || '—'}</td>
                      <td className="py-2.5 text-gray-400 text-xs">{p.leadDeveloper?.name || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
