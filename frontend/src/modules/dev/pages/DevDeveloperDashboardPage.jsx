import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { devApi } from '../../../api/dev.api'

const STATUS_COLORS = {
  backlog:     'bg-gray-700 text-gray-300',
  todo:        'bg-blue-900/40 text-blue-300',
  in_progress: 'bg-yellow-900/30 text-yellow-300',
  code_review: 'bg-purple-900/30 text-purple-300',
  testing:     'bg-cyan-900/30 text-cyan-300',
  done:        'bg-green-900/30 text-green-300',
  blocked:     'bg-red-900/30 text-red-300',
}

const PRIORITY_COLORS = { critical: 'text-red-400', high: 'text-orange-400', medium: 'text-yellow-400', low: 'text-green-400' }

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-[#1A3A6B] rounded-2xl p-5">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${accent || 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

function TaskRow({ task, navigate }) {
  const projectId = task.projectId?._id || task.projectId
  return (
    <div
      className="flex items-center gap-3 py-3 border-b border-blue-900/50 hover:bg-white/5 px-2 rounded-lg cursor-pointer transition-colors"
      onClick={() => projectId && navigate(`/dev/projects/${projectId}`)}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{task.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {task.projectId?.name || '—'}
          {task.milestoneId?.title ? ` · ${task.milestoneId.title}` : ''}
        </p>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[task.status]}`}>
        {task.status?.replace('_', ' ')}
      </span>
      {task.dueDate && (
        <span className={`text-xs shrink-0 ${new Date(task.dueDate) < new Date() ? 'text-red-400' : 'text-gray-500'}`}>
          {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </span>
      )}
      <span className={`text-xs font-semibold shrink-0 ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
    </div>
  )
}

export default function DevDeveloperDashboardPage() {
  const navigate = useNavigate()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    devApi.developerDashboard()
      .then(r => setData(r.data.data))
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>
  if (error)   return <div className="text-red-400 text-center py-8">{error}</div>
  if (!data)   return null

  const {
    taskCounts = {},
    overdueTasks = [],
    dueSoonTasks = [],
    myBugs = [],
    weeklyMinutesLogged = 0,
  } = data

  const activeCount  = (taskCounts.in_progress || 0) + (taskCounts.code_review || 0) + (taskCounts.testing || 0)
  const totalTimeH   = Math.floor(weeklyMinutesLogged / 60)
  const totalTimeM   = weeklyMinutesLogged % 60
  const openBugs     = myBugs.filter(b => !['closed', 'wont_fix', 'duplicate'].includes(b.status)).length

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Your tasks, bugs, and logged time this week</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Tasks"  value={activeCount}          sub="in progress / review" accent="text-[#00C6FF]" />
        <StatCard label="Overdue"       value={overdueTasks.length}  sub="past due date"        accent={overdueTasks.length > 0 ? 'text-red-400' : 'text-white'} />
        <StatCard label="Due This Week" value={dueSoonTasks.length}  sub="upcoming deadlines"   accent="text-yellow-400" />
        <StatCard label="Time This Week" value={`${totalTimeH}h ${totalTimeM}m`} sub="time logged" accent="text-green-400" />
      </div>

      {/* Status breakdown chips */}
      {Object.keys(taskCounts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(taskCounts).map(([s, n]) => (
            <span key={s} className={`text-xs px-2.5 py-1 rounded-full ${STATUS_COLORS[s] || 'bg-gray-700 text-gray-300'}`}>
              {s.replace('_', ' ')} · {n}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue tasks */}
        <div className="bg-[#0A1628] border border-red-900/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Overdue Tasks</h2>
            {overdueTasks.length > 0 && (
              <span className="text-xs bg-red-900/50 text-red-300 px-2 py-0.5 rounded-full">{overdueTasks.length}</span>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {overdueTasks.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No overdue tasks. Keep it up!</p>
            ) : (
              overdueTasks.map(t => <TaskRow key={t._id} task={t} navigate={navigate} />)
            )}
          </div>
        </div>

        {/* Due soon */}
        <div className="bg-[#0A1628] border border-blue-900 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Due This Week</h2>
            <span className="text-xs text-gray-500">{dueSoonTasks.length} tasks</span>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {dueSoonTasks.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No tasks due this week.</p>
            ) : (
              dueSoonTasks.map(t => <TaskRow key={t._id} task={t} navigate={navigate} />)
            )}
          </div>
        </div>
      </div>

      {/* My Bugs */}
      {myBugs.length > 0 && (
        <div className="bg-[#0A1628] border border-blue-900 rounded-2xl p-5">
          <h2 className="text-base font-semibold text-white mb-4">
            My Bugs
            <span className="ml-2 text-sm font-normal text-gray-500">({openBugs} open)</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-blue-900">
                  <th className="text-left py-2 pr-4">Title</th>
                  <th className="text-left py-2 pr-4">Project</th>
                  <th className="text-left py-2 pr-4">Severity</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {myBugs.map(b => (
                  <tr key={b._id} className="border-b border-blue-900/30 hover:bg-white/5">
                    <td className="py-2.5 pr-4 text-gray-200 max-w-50 truncate">{b.title}</td>
                    <td className="py-2.5 pr-4 text-gray-400 text-xs">{b.projectId?.name || '—'}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`text-xs font-medium ${
                        b.severity === 'blocker' ? 'text-red-400' :
                        b.severity === 'critical' ? 'text-orange-400' :
                        b.severity === 'major' ? 'text-yellow-400' : 'text-gray-400'
                      }`}>{b.severity}</span>
                    </td>
                    <td className="py-2.5 text-xs text-gray-400">{b.status?.replace('_', ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
