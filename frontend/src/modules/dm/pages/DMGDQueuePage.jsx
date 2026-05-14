import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dmApi } from '../../../api/dm.api'
import { gdApi } from '../../../api/gd.api'
import { AlertTriangle, CheckCircle, Clock, RefreshCw, Palette } from 'lucide-react'

const STATUS_COLOR = {
  new:'bg-gray-700 text-gray-200', in_progress:'bg-blue-900 text-blue-200',
  submitted:'bg-yellow-900 text-yellow-200', revision_requested:'bg-orange-900 text-orange-200',
  approved:'bg-green-900 text-green-200', delivered_to_client:'bg-purple-900 text-purple-200',
}
const STATUS_LABEL = {
  new:'New', in_progress:'In Progress', submitted:'Submitted',
  revision_requested:'Revision', approved:'Approved', delivered_to_client:'Delivered',
}
const PRIORITY_COLOR = { high:'text-red-400', medium:'text-yellow-400', low:'text-green-400' }

function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: '#1A3A6B' }}>
      <Icon size={18} style={{ color }} />
      <div>
        <p className="text-xl font-bold text-white">{value ?? 0}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    </div>
  )
}

export default function DMGDQueuePage() {
  const [data,          setData]          = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [actionLoading, setActionLoading] = useState({})
  const [revModal,      setRevModal]      = useState(null) // taskId
  const [revNotes,      setRevNotes]      = useState('')
  const [err,           setErr]           = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await dmApi.getDMGDPipeline()
      setData(res.data.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const doAction = async (taskId, fn) => {
    setActionLoading(a => ({ ...a, [taskId]: true }))
    setErr('')
    try { await fn(); await load() }
    catch (e) { setErr(e.response?.data?.error?.message || 'Action failed') }
    finally { setActionLoading(a => ({ ...a, [taskId]: false })) }
  }

  const handleApprove = (taskId) =>
    doAction(taskId, () => gdApi.approveTask(taskId))

  const handleRevision = async () => {
    if (!revNotes.trim()) { setErr('Notes required'); return }
    await doAction(revModal, () => gdApi.requestRevision(revModal, { revisionNotes: revNotes }))
    setRevModal(null); setRevNotes('')
  }

  if (loading) return <div className="p-8 text-gray-400">Loading…</div>
  if (!data)   return <div className="p-8 text-red-400">Failed to load pipeline</div>

  const { counts, pendingTasks, stuckTasks } = data
  const submitted = counts?.submitted || 0
  const inProgress = (counts?.new || 0) + (counts?.in_progress || 0)
  const revRequested = counts?.revision_requested || 0

  return (
    <div className="p-6 space-y-6" style={{ color: '#fff' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            GD Work Queue
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">GD tasks you assigned — review submitted work here</p>
        </div>
        <button onClick={load} className="p-2 text-gray-400 hover:text-white border border-white/10 rounded-lg">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="In Progress"      value={inProgress}          color="#1E6FD9"  icon={Clock} />
        <StatCard label="Awaiting Review"  value={submitted}           color="#eab308"  icon={Palette} />
        <StatCard label="Revision Sent"    value={revRequested}        color="#FF6B00"  icon={AlertTriangle} />
        <StatCard label="Stuck (>2 days)"  value={stuckTasks?.length}  color="#ef4444"  icon={AlertTriangle} />
      </div>

      {err && <p className="text-red-400 text-sm">{err}</p>}

      {/* Submitted — needs review */}
      {submitted > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#1A3A6B' }}>
          <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2">
            <CheckCircle size={15} className="text-yellow-400" />
            <h2 className="font-semibold text-white">Awaiting Your Review ({submitted})</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-white/5">
                <th className="px-4 py-2">Task</th>
                <th className="px-4 py-2">Client</th>
                <th className="px-4 py-2">Designer</th>
                <th className="px-4 py-2">Submitted</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingTasks?.filter(t => t.status === 'submitted').map(task => (
                <tr key={task._id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <Link to={`/gd/tasks/${task._id}`} className="text-white hover:text-blue-400 font-medium">
                      {task.title}
                    </Link>
                    <p className={`text-xs ${PRIORITY_COLOR[task.priority]}`}>{task.priority}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{task.client?.companyName}</td>
                  <td className="px-4 py-3 text-gray-300">{task.assignedTo?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {task.submittedAt ? new Date(task.submittedAt).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        disabled={actionLoading[task._id]}
                        onClick={() => handleApprove(task._id)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold text-white disabled:opacity-40"
                        style={{ backgroundColor: '#10b981' }}>
                        Approve
                      </button>
                      <button
                        disabled={actionLoading[task._id]}
                        onClick={() => { setRevModal(task._id); setRevNotes('') }}
                        className="px-3 py-1 rounded-lg text-xs font-semibold text-white disabled:opacity-40"
                        style={{ backgroundColor: '#FF6B00' }}>
                        Revision
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stuck tasks alert */}
      {stuckTasks?.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#1A3A6B' }}>
          <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2">
            <AlertTriangle size={15} className="text-red-400" />
            <h2 className="font-semibold text-white">Stuck Tasks — Submitted &gt;2 days ago ({stuckTasks.length})</h2>
          </div>
          {stuckTasks.map(task => (
            <div key={task._id} className="flex items-center gap-3 px-5 py-3 border-b border-white/5 last:border-0">
              <div className="flex-1">
                <Link to={`/gd/tasks/${task._id}`} className="text-white hover:text-blue-400 text-sm font-medium">
                  {task.title}
                </Link>
                <p className="text-xs text-gray-400">{task.client?.companyName} · {task.assignedTo?.name || 'Unassigned'}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[task.status]}`}>
                {STATUS_LABEL[task.status]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* All pending tasks */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#1A3A6B' }}>
        <div className="px-5 py-3 border-b border-white/10">
          <h2 className="font-semibold text-white">All Pending GD Tasks ({pendingTasks?.length})</h2>
        </div>
        {pendingTasks?.length === 0 ? (
          <p className="p-5 text-sm text-gray-400">No pending tasks — all caught up!</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-white/5">
                <th className="px-4 py-2">Task</th>
                <th className="px-4 py-2">Client</th>
                <th className="px-4 py-2">Designer</th>
                <th className="px-4 py-2">Due</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {pendingTasks?.map(task => (
                <tr key={task._id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <Link to={`/gd/tasks/${task._id}`} className="text-white hover:text-blue-400 font-medium">
                      {task.title}
                    </Link>
                    {task.revisionCount > 0 && (
                      <span className="ml-2 text-xs text-orange-400">Rev×{task.revisionCount}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{task.client?.companyName}</td>
                  <td className="px-4 py-3 text-gray-300">{task.assignedTo?.name || <span className="text-gray-500 italic">Unassigned</span>}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[task.status]}`}>
                      {STATUS_LABEL[task.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Revision modal */}
      {revModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 className="text-lg font-bold text-white">Request Revision</h3>
            <textarea rows={4}
              className="w-full px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none resize-none"
              placeholder="What needs to change?"
              value={revNotes} onChange={e => setRevNotes(e.target.value)}
            />
            {err && <p className="text-red-400 text-xs">{err}</p>}
            <div className="flex gap-3">
              <button onClick={() => setRevModal(null)}
                className="flex-1 py-2 rounded-xl text-sm border border-white/20 text-gray-300">
                Cancel
              </button>
              <button onClick={handleRevision} disabled={actionLoading[revModal]}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: '#FF6B00' }}>
                Send Revision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
