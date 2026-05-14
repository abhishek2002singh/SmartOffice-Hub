import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { gdApi } from '../../../api/gd.api'
import { Users, AlertTriangle, CheckCircle, TrendingUp, Clock } from 'lucide-react'

const STATUS_COLOR = {
  new:'bg-gray-700 text-gray-200', in_progress:'bg-blue-900 text-blue-200',
  submitted:'bg-yellow-900 text-yellow-200', revision_requested:'bg-orange-900 text-orange-200',
  approved:'bg-green-900 text-green-200', delivered_to_client:'bg-purple-900 text-purple-200',
}
const STATUS_LABEL = {
  new:'New', in_progress:'In Progress', submitted:'Submitted',
  revision_requested:'Revision', approved:'Approved', delivered_to_client:'Delivered',
}

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="rounded-xl p-4 flex items-center gap-4" style={{ backgroundColor: '#1A3A6B' }}>
      <div className="p-3 rounded-lg" style={{ backgroundColor: color + '22' }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value ?? 0}</p>
        <p className="text-xs text-gray-400">{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color }}>{sub}</p>}
      </div>
    </div>
  )
}

export default function GDHeadDashboard() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    gdApi.headDashboard().then(r => setData(r.data.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-gray-400">Loading…</div>
  if (!data)   return <div className="p-8 text-red-400">Failed to load</div>

  const sc = data.statusCounts || {}
  const total = Object.values(sc).reduce((a, b) => a + b, 0)
  const { stats } = data

  return (
    <div className="p-6 space-y-6" style={{ color: '#fff' }}>
      <h1 className="text-2xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>GD Head Dashboard</h1>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Tasks"   value={total}            icon={CheckCircle}  color="#00C6FF" />
        <StatCard label="On-Time %"     value={`${stats?.onTimePct ?? 0}%`}  icon={TrendingUp}   color="#10b981"
          sub={`${stats?.onTime ?? 0} on time, ${stats?.late ?? 0} late`} />
        <StatCard label="Avg Revisions" value={stats?.avgRevisions ?? 0}     icon={AlertTriangle} color="#FF6B00" />
        <StatCard label="Overdue"       value={data.overdueTasks?.length}    icon={Clock}         color="#ef4444" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Designer workload */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#1A3A6B' }}>
          <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Users size={16} style={{ color: '#00C6FF' }} /> Designer Workload
          </h2>
          {data.designerLoad?.length === 0
            ? <p className="text-sm text-gray-400">No data</p>
            : data.designerLoad?.map(d => (
              <div key={d._id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm text-white">{d.user?.name || 'Unassigned'}</p>
                  <p className="text-xs text-gray-400">Avg {parseFloat(d.avgRevisions || 0).toFixed(1)} revisions</p>
                </div>
                <span className="text-lg font-bold" style={{ color: '#1E6FD9' }}>{d.active}</span>
              </div>
            ))
          }
        </div>

        {/* Overdue tasks */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#1A3A6B' }}>
          <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" /> Overdue Tasks
          </h2>
          {data.overdueTasks?.length === 0
            ? <p className="text-sm text-gray-400">No overdue tasks 🎉</p>
            : data.overdueTasks?.map(t => (
              <Link to={`/gd/tasks/${t._id}`} key={t._id}
                className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0 hover:opacity-80">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{t.title}</p>
                  <p className="text-xs text-gray-400">{t.client?.companyName} · {t.assignedTo?.name || 'Unassigned'}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOR[t.status]}`}>
                  {STATUS_LABEL[t.status]}
                </span>
              </Link>
            ))
          }
        </div>
      </div>

      {/* Status breakdown */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: '#1A3A6B' }}>
        <h2 className="font-semibold text-white mb-4">Status Breakdown</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {Object.entries(STATUS_LABEL).map(([key, label]) => (
            <div key={key} className="text-center">
              <p className="text-2xl font-bold text-white">{sc[key] || 0}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[key]}`}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: '#1A3A6B' }}>
        <h2 className="font-semibold text-white mb-3">Recent Activity</h2>
        {data.recentActivity?.map(t => (
          <Link to={`/gd/tasks/${t._id}`} key={t._id}
            className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0 hover:opacity-80">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{t.title}</p>
              <p className="text-xs text-gray-400">{t.client?.companyName} · {t.assignedTo?.name || 'Unassigned'}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOR[t.status]}`}>
              {STATUS_LABEL[t.status]}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
