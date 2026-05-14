import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { gdApi } from '../../../api/gd.api'
import { Clock, CheckCircle, AlertTriangle, Layers, Timer } from 'lucide-react'

const STATUS_COLOR = {
  new:                'bg-gray-700 text-gray-200',
  in_progress:        'bg-blue-900 text-blue-200',
  submitted:          'bg-yellow-900 text-yellow-200',
  revision_requested: 'bg-orange-900 text-orange-200',
  approved:           'bg-green-900 text-green-200',
  delivered_to_client:'bg-purple-900 text-purple-200',
}
const STATUS_LABEL = {
  new:                'New',
  in_progress:        'In Progress',
  submitted:          'Submitted',
  revision_requested: 'Revision',
  approved:           'Approved',
  delivered_to_client:'Delivered',
}
const PRIORITY_DOT = { high: 'bg-red-500', medium: 'bg-yellow-400', low: 'bg-green-500' }

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-xl p-4 flex items-center gap-4" style={{ backgroundColor: '#1A3A6B' }}>
      <div className="p-3 rounded-lg" style={{ backgroundColor: color + '22' }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value ?? 0}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    </div>
  )
}

function TaskRow({ task }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !['approved','delivered_to_client'].includes(task.status)
  return (
    <Link to={`/gd/tasks/${task._id}`}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group">
      <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority] || 'bg-gray-500'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate group-hover:text-blue-300 transition-colors">{task.title}</p>
        <p className="text-xs text-gray-400">{task.client?.companyName}</p>
      </div>
      {isOverdue && <AlertTriangle size={14} className="text-red-400 shrink-0" title="Overdue" />}
      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOR[task.status]}`}>
        {STATUS_LABEL[task.status]}
      </span>
    </Link>
  )
}

export default function GDDesignerDashboard() {
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    gdApi.designerDashboard().then(r => setData(r.data.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-gray-400">Loading dashboard…</div>
  if (!data)   return <div className="p-8 text-red-400">Failed to load dashboard</div>

  const sc = data.statusCounts || {}
  const activeCount = (sc.new || 0) + (sc.in_progress || 0) + (sc.revision_requested || 0)
  const hrs = Math.floor((data.totalMinutesLogged || 0) / 60)
  const mins = (data.totalMinutesLogged || 0) % 60

  return (
    <div className="p-6 space-y-6" style={{ color: '#fff' }}>
      <h1 className="text-2xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>My Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Tasks"    value={activeCount}           icon={Layers}       color="#1E6FD9" />
        <StatCard label="Submitted"       value={sc.submitted || 0}     icon={CheckCircle}  color="#00C6FF" />
        <StatCard label="Revisions"       value={sc.revision_requested || 0} icon={AlertTriangle} color="#FF6B00" />
        <StatCard label="Time Logged"     value={`${hrs}h ${mins}m`}    icon={Timer}        color="#10b981" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Due Today */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#1A3A6B' }}>
          <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Clock size={16} style={{ color: '#FF6B00' }} /> Due Today
          </h2>
          {data.dueTodayTasks?.length === 0
            ? <p className="text-sm text-gray-400">No tasks due today</p>
            : data.dueTodayTasks?.map(t => <TaskRow key={t._id} task={t} />)
          }
        </div>

        {/* Active Tasks */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#1A3A6B' }}>
          <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Layers size={16} style={{ color: '#00C6FF' }} /> My Tasks
          </h2>
          {data.recentTasks?.length === 0
            ? <p className="text-sm text-gray-400">No active tasks</p>
            : data.recentTasks?.map(t => <TaskRow key={t._id} task={t} />)
          }
        </div>
      </div>
    </div>
  )
}
