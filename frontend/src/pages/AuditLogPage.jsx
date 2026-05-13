import { useEffect, useState, useCallback } from 'react'
import api from '../api/axios'
import { Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import dayjs from 'dayjs'

const ACTION_STYLE = {
  CREATE: { bg: 'rgba(34,197,94,0.15)',   color: '#22c55e' },
  UPDATE: { bg: 'rgba(30,111,217,0.2)',   color: '#60a5fa' },
  DELETE: { bg: 'rgba(239,68,68,0.15)',   color: '#f87171' },
}

const RESOURCES = ['user', 'department', 'user_permissions', 'settings', 'department']

function Badge({ text, style }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={style}>
      {text}
    </span>
  )
}

function DetailModal({ log, onClose }) {
  if (!log) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-2xl rounded-2xl border overflow-hidden shadow-2xl" style={{ backgroundColor: '#112044', borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div>
            <p className="text-white font-semibold">Audit Log Detail</p>
            <p className="text-xs text-gray-400 mt-0.5">{dayjs(log.createdAt).format('DD MMM YYYY, HH:mm:ss')}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none px-2">×</button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500 text-xs mb-1">User</p>
              <p className="text-white">{log.userId?.name || '—'} <span className="text-gray-500">({log.userId?.email})</span></p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Action</p>
              <Badge text={log.action} style={ACTION_STYLE[log.action]} />
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Resource</p>
              <p className="text-white font-mono">{log.resource}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Resource ID</p>
              <p className="text-gray-400 font-mono text-xs truncate">{log.resourceId || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">IP Address</p>
              <p className="text-gray-400 font-mono">{log.ipAddress || '—'}</p>
            </div>
          </div>

          {log.changes?.before && (
            <div>
              <p className="text-gray-500 text-xs mb-2">Before</p>
              <pre className="text-xs text-gray-300 p-3 rounded-xl overflow-auto max-h-48"
                style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {JSON.stringify(log.changes.before, null, 2)}
              </pre>
            </div>
          )}
          {log.changes?.after && (
            <div>
              <p className="text-gray-500 text-xs mb-2">After</p>
              <pre className="text-xs text-gray-300 p-3 rounded-xl overflow-auto max-h-48"
                style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                {JSON.stringify(log.changes.after, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AuditLogPage() {
  const [logs, setLogs]       = useState([])
  const [total, setTotal]     = useState(0)
  const [pages, setPages]     = useState(1)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)

  const [filters, setFilters] = useState({ action: '', resource: '', from: '', to: '', page: 1, limit: 25 })

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
      const { data } = await api.get('/audit-logs', { params })
      setLogs(data.data.logs)
      setTotal(data.data.total)
      setPages(data.data.pages)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value, page: 1 }))
  const setPage   = (p) => setFilters((f) => ({ ...f, page: p }))

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-white">Audit Logs</h2>
        <p className="text-sm text-gray-400 mt-0.5">{total} total records</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={filters.action}
          onChange={(e) => setFilter('action', e.target.value)}
          className="px-3 py-2 rounded-xl text-sm text-white border focus:outline-none"
          style={{ backgroundColor: '#1A3A6B', borderColor: 'rgba(255,255,255,0.12)' }}
        >
          <option value="">All Actions</option>
          {['CREATE', 'UPDATE', 'DELETE'].map((a) => <option key={a} value={a} style={{ backgroundColor: '#1A3A6B' }}>{a}</option>)}
        </select>

        <select
          value={filters.resource}
          onChange={(e) => setFilter('resource', e.target.value)}
          className="px-3 py-2 rounded-xl text-sm text-white border focus:outline-none"
          style={{ backgroundColor: '#1A3A6B', borderColor: 'rgba(255,255,255,0.12)' }}
        >
          <option value="">All Resources</option>
          {RESOURCES.map((r) => <option key={r} value={r} style={{ backgroundColor: '#1A3A6B' }}>{r}</option>)}
        </select>

        <input
          type="date"
          value={filters.from}
          onChange={(e) => setFilter('from', e.target.value)}
          className="px-3 py-2 rounded-xl text-sm text-white border focus:outline-none"
          style={{ backgroundColor: '#1A3A6B', borderColor: 'rgba(255,255,255,0.12)', colorScheme: 'dark' }}
          placeholder="From date"
        />
        <input
          type="date"
          value={filters.to}
          onChange={(e) => setFilter('to', e.target.value)}
          className="px-3 py-2 rounded-xl text-sm text-white border focus:outline-none"
          style={{ backgroundColor: '#1A3A6B', borderColor: 'rgba(255,255,255,0.12)', colorScheme: 'dark' }}
        />

        {(filters.action || filters.resource || filters.from || filters.to) && (
          <button
            onClick={() => setFilters({ action: '', resource: '', from: '', to: '', page: 1, limit: 25 })}
            className="px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#1A3A6B' }}>
              {['Timestamp', 'User', 'Action', 'Resource', 'Details'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-500">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-500">No audit logs found</td></tr>
            ) : logs.map((log, i) => (
              <tr
                key={log._id}
                className="cursor-pointer hover:bg-white/5 transition-colors"
                style={{ backgroundColor: i % 2 === 0 ? 'rgba(26,58,107,0.25)' : 'transparent' }}
                onClick={() => setSelected(log)}
              >
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                  {dayjs(log.createdAt).format('DD MMM, HH:mm')}
                </td>
                <td className="px-4 py-3">
                  <p className="text-white text-xs font-medium">{log.userId?.name || 'System'}</p>
                  <p className="text-gray-500 text-xs">{log.userId?.email || '—'}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge text={log.action} style={ACTION_STYLE[log.action] || {}} />
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-300">{log.resource}</td>
                <td className="px-4 py-3">
                  <ExternalLink size={14} className="text-gray-500 hover:text-white transition-colors" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Page {filters.page} of {pages} ({total} records)
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={filters.page <= 1}
              onClick={() => setPage(filters.page - 1)}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
              const p = i + Math.max(1, filters.page - 2)
              if (p > pages) return null
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className="w-8 h-8 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: filters.page === p ? '#1E6FD9' : 'rgba(255,255,255,0.05)',
                    color: filters.page === p ? '#fff' : '#9ca3af',
                  }}
                >
                  {p}
                </button>
              )
            })}
            <button
              disabled={filters.page >= pages}
              onClick={() => setPage(filters.page + 1)}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <DetailModal log={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
