import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { gdApi } from '../../../api/gd.api'
import { clientsApi } from '../../../api/clients.api'
import { Plus, Filter, Search } from 'lucide-react'
import GDCreateTaskModal from '../components/GDCreateTaskModal'

const STATUS_COLOR = {
  new:'bg-gray-700 text-gray-200', in_progress:'bg-blue-900 text-blue-200',
  submitted:'bg-yellow-900 text-yellow-200', revision_requested:'bg-orange-900 text-orange-200',
  approved:'bg-green-900 text-green-200', delivered_to_client:'bg-purple-900 text-purple-200',
}
const STATUS_LABEL = {
  new:'New', in_progress:'In Progress', submitted:'Submitted',
  revision_requested:'Revision', approved:'Approved', delivered_to_client:'Delivered',
}
const PRIORITY_STYLES = { high:'text-red-400', medium:'text-yellow-400', low:'text-green-400' }
const TYPE_LABEL = {
  video:'Video', reel:'Reel', image:'Image', carousel:'Carousel',
  poster:'Poster', thumbnail:'Thumbnail', banner:'Banner', other:'Other',
}

const STATUSES = Object.keys(STATUS_LABEL)
const PRIORITIES = ['high', 'medium', 'low']

export default function GDTaskInboxPage() {
  const [tasks,    setTasks]    = useState([])
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [creating, setCreating] = useState(false)
  const [page,     setPage]     = useState(1)

  const [filters, setFilters] = useState({
    status: '', priority: '', client: '', q: '',
  })

  const fetchTasks = async (pg = page) => {
    setLoading(true)
    try {
      const params = { page: pg, limit: 20, sort: '-createdAt' }
      if (filters.status)   params.status   = filters.status
      if (filters.priority) params.priority = filters.priority
      if (filters.client)   params.client   = filters.client
      if (filters.q)        params.q        = filters.q
      const res = await gdApi.listTasks(params)
      setTasks(res.data.data.tasks)
      setTotal(res.data.data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTasks(1); setPage(1) }, [filters])
  useEffect(() => { if (page > 1) fetchTasks(page) }, [page])

  const isOverdue = (t) =>
    t.dueDate && new Date(t.dueDate) < new Date() && !['approved','delivered_to_client'].includes(t.status)

  return (
    <div className="p-6 space-y-5" style={{ color: '#fff' }}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          GD Task Inbox
        </h1>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          style={{ backgroundColor: '#1E6FD9', color: '#fff' }}
        >
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: '#1A3A6B' }}>
          <Search size={14} className="text-gray-400" />
          <input
            className="bg-transparent text-sm text-white outline-none w-36 placeholder-gray-500"
            placeholder="Search…"
            value={filters.q}
            onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
          />
        </div>

        <select
          className="text-sm rounded-xl px-3 py-2 outline-none"
          style={{ backgroundColor: '#1A3A6B', color: '#fff', border: 'none' }}
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
        >
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>

        <select
          className="text-sm rounded-xl px-3 py-2 outline-none"
          style={{ backgroundColor: '#1A3A6B', color: '#fff', border: 'none' }}
          value={filters.priority}
          onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}
        >
          <option value="">All Priority</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>

        {(filters.status || filters.priority || filters.q) && (
          <button onClick={() => setFilters({ status:'', priority:'', client:'', q:'' })}
            className="text-xs text-gray-400 hover:text-white px-2">
            Clear
          </button>
        )}
      </div>

      {/* Task table */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#1A3A6B' }}>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No tasks found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 text-xs uppercase tracking-wide border-b border-white/10">
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Assigned To</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr key={task._id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/gd/tasks/${task._id}`} className="hover:text-blue-400 transition-colors">
                      <span className="font-medium text-white">{task.title}</span>
                      {task.revisionCount > 0 && (
                        <span className="ml-2 text-xs text-orange-400">Rev×{task.revisionCount}</span>
                      )}
                    </Link>
                    <p className={`text-xs mt-0.5 ${PRIORITY_STYLES[task.priority]}`}>
                      {task.priority} priority
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{task.client?.companyName || '—'}</td>
                  <td className="px-4 py-3 text-gray-300">{TYPE_LABEL[task.type] || task.type}</td>
                  <td className="px-4 py-3 text-gray-300">{task.assignedTo?.name || <span className="text-gray-500 italic">Unassigned</span>}</td>
                  <td className={`px-4 py-3 text-xs ${isOverdue(task) ? 'text-red-400 font-semibold' : 'text-gray-400'}`}>
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN') : '—'}
                    {isOverdue(task) && ' ⚠'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLOR[task.status]}`}>
                      {STATUS_LABEL[task.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
            <span className="text-xs text-gray-400">{total} total tasks</span>
            <div className="flex gap-2">
              <button disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 text-xs rounded-lg bg-white/10 text-white disabled:opacity-30">
                Prev
              </button>
              <button disabled={page * 20 >= total}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 text-xs rounded-lg bg-white/10 text-white disabled:opacity-30">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {creating && (
        <GDCreateTaskModal
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); fetchTasks(1) }}
        />
      )}
    </div>
  )
}
