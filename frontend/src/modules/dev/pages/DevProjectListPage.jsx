import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { devApi } from '../../../api/dev.api'
import DevCreateProjectModal from '../components/DevCreateProjectModal'

const STATUS_COLORS = {
  planning:    'bg-yellow-900/30 text-yellow-300',
  active:      'bg-green-900/30 text-green-300',
  on_hold:     'bg-orange-900/30 text-orange-300',
  completed:   'bg-blue-900/30 text-blue-300',
  maintenance: 'bg-purple-900/30 text-purple-300',
  cancelled:   'bg-red-900/30 text-red-300',
}

const TYPE_LABELS = {
  website:   'Website',
  web_app:   'Web App',
  ecommerce: 'E-commerce',
  mobile_app:'Mobile App',
  api:       'API',
  custom:    'Custom',
}

const PRIORITY_COLORS = {
  high:   'text-red-400',
  medium: 'text-yellow-400',
  low:    'text-green-400',
}

export default function DevProjectListPage() {
  const navigate = useNavigate()
  const [projects, setProjects]   = useState([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [filters, setFilters]     = useState({ status: '', type: '', q: '' })
  const [page, setPage]           = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 20, ...filters }
      Object.keys(params).forEach(k => !params[k] && delete params[k])
      const r = await devApi.listProjects(params)
      setProjects(r.data.data.projects)
      setTotal(r.data.data.total)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [page, filters])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Development Projects</h1>
          <p className="text-sm text-gray-400">{total} project{total !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-[#1E6FD9] hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
        >
          + New Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text" placeholder="Search projects..."
          value={filters.q}
          onChange={e => { setFilters(f => ({ ...f, q: e.target.value })); setPage(1) }}
          className="px-3 py-2 bg-[#1A3A6B] border border-blue-800 rounded-lg text-white placeholder-gray-400 text-sm w-56"
        />
        <select
          value={filters.status}
          onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1) }}
          className="px-3 py-2 bg-[#1A3A6B] border border-blue-800 rounded-lg text-white text-sm"
        >
          <option value="">All Status</option>
          {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select
          value={filters.type}
          onChange={e => { setFilters(f => ({ ...f, type: e.target.value })); setPage(1) }}
          className="px-3 py-2 bg-[#1A3A6B] border border-blue-800 rounded-lg text-white text-sm"
        >
          <option value="">All Types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Project Cards */}
      {loading ? (
        <div className="text-center text-gray-400 py-16">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-center text-gray-400 py-16">No projects found. Create the first one!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map(p => (
            <div
              key={p._id}
              onClick={() => navigate(`/dev/projects/${p._id}`)}
              className="bg-[#1A3A6B] rounded-xl p-5 border border-blue-900 hover:border-[#1E6FD9] cursor-pointer transition-all hover:shadow-lg hover:shadow-blue-900/20 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-white text-lg leading-tight">{p.name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full shrink-0 capitalize ${STATUS_COLORS[p.status] || 'bg-gray-700 text-gray-300'}`}>
                  {p.status?.replace('_', ' ')}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded text-xs">
                  {TYPE_LABELS[p.type] || p.type}
                  {p.ecommercePlatform ? ` (${p.ecommercePlatform})` : ''}
                </span>
                <span className={`text-xs font-medium ${PRIORITY_COLORS[p.priority]}`}>
                  {p.priority} priority
                </span>
              </div>

              <div className="text-sm text-gray-400">
                {p.clientId?.companyName || p.clientId?.name || '—'}
              </div>

              {/* Tech stack */}
              {p.techStack?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {p.techStack.slice(0, 4).map((t, i) => (
                    <span key={i} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{t}</span>
                  ))}
                  {p.techStack.length > 4 && <span className="text-xs text-gray-500">+{p.techStack.length - 4}</span>}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-blue-900">
                <span>PM: {p.projectManager?.name || 'Unassigned'}</span>
                {p.plannedEndDate && (
                  <span>Due {new Date(p.plannedEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1 bg-[#1A3A6B] text-white rounded disabled:opacity-40">←</button>
          <span className="text-gray-400 text-sm py-1">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1 bg-[#1A3A6B] text-white rounded disabled:opacity-40">→</button>
        </div>
      )}

      {showCreate && <DevCreateProjectModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  )
}
