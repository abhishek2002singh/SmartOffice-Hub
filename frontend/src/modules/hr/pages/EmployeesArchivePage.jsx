import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { hrApi } from '../../../api/hr.api'
import DeleteModal from '../../../components/DeleteModal'
import { Archive, Search, RotateCcw, Trash2, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react'
import dayjs from 'dayjs'

const STATUS_COLORS = {
  probation:   'bg-yellow-500/20 text-yellow-300',
  confirmed:   'bg-green-500/20  text-green-300',
  resigned:    'bg-orange-500/20 text-orange-300',
  terminated:  'bg-red-500/20    text-red-300',
  relieved:    'bg-blue-500/20   text-blue-300',
  absconding:  'bg-red-700/20    text-red-400',
}

export default function EmployeesArchivePage() {
  const { user: me } = useSelector(s => s.auth)
  const isSuperadmin = me?.role === 'SUPERADMIN'

  const [employees, setEmployees] = useState([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [loading, setLoading]     = useState(false)
  const [q, setQ]                 = useState('')

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting]         = useState(false)
  const [deleteError, setDeleteError]   = useState('')

  // Restore state
  const [restoring, setRestoring] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 20, ...(q ? { q } : {}) }
      const { data } = await hrApi.listArchivedEmployees(params)
      setEmployees(data.data.employees)
      setTotal(data.data.total)
    } catch (_) {}
    finally { setLoading(false) }
  }, [page, q])

  useEffect(() => { load() }, [load])

  const restore = async (emp) => {
    setRestoring(emp._id)
    try {
      await hrApi.restoreEmployee(emp._id)
      load()
    } catch (_) {}
    finally { setRestoring(null) }
  }

  const openHardDelete = (emp, e) => {
    e.preventDefault()
    setDeleteError('')
    setDeleteTarget(emp)
  }

  const confirmHardDelete = async ({ confirmText, reason }) => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError('')
    try {
      await hrApi.hardDeleteEmployee(deleteTarget._id, { confirmText, reason })
      setDeleteTarget(null)
      load()
    } catch (err) {
      setDeleteError(err.response?.data?.error?.message || 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.ceil(total / 20)
  const empName = (emp) => [emp.firstName, emp.lastName].filter(Boolean).join(' ')

  return (
    <div className="p-6 space-y-6" style={{ color: '#fff' }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/hr/employees" className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white">
            <ArrowLeft size={18} />
          </Link>
          <Archive size={22} style={{ color: '#FF6B00' }} />
          <h1 className="text-xl font-bold">Employees Archive</h1>
          <span className="text-sm px-2 py-0.5 rounded" style={{ backgroundColor: '#FF6B00', color: '#fff' }}>{total}</span>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-lg px-4 py-3 text-sm text-orange-300"
        style={{ backgroundColor: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.25)' }}>
        Archived employees have their login deactivated and are not visible in the directory. Restore to reactivate their account, or permanently delete (Superadmin only).
      </div>

      {deleteError && (
        <div className="rounded-lg px-4 py-3 text-sm text-red-300"
          style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
          {deleteError}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none"
          placeholder="Search archived employees…"
          value={q}
          onChange={e => { setQ(e.target.value); setPage(1) }}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading…</div>
        ) : employees.length === 0 ? (
          <div className="p-10 text-center">
            <Archive size={32} className="mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">No archived employees</p>
            <Link to="/hr/employees" className="text-sm text-blue-400 hover:text-blue-300 mt-1 block">
              ← Back to employees
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                {['Employee', 'Code', 'Designation', 'Department', 'Status', 'Archived On', 'Archived By', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-semibold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, i) => {
                const name = empName(emp)
                return (
                  <tr
                    key={emp._id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{name}</p>
                      <p className="text-xs text-gray-400">{emp.officialEmail || emp.personalEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-300 font-mono text-xs">{emp.employeeCode}</td>
                    <td className="px-4 py-3 text-gray-300">{emp.designation || '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{emp.departmentId?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[emp.employmentStatus] || 'bg-gray-500/20 text-gray-300'}`}>
                        {emp.employmentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {emp.deletedAt ? dayjs(emp.deletedAt).format('DD MMM YYYY, HH:mm') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {emp.deletedBy?.name || emp.deletedBy?.email || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => restore(emp)}
                          disabled={restoring === emp._id}
                          title="Restore employee"
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-green-300 hover:bg-green-900/30 disabled:opacity-50"
                        >
                          <RotateCcw size={12} />
                          {restoring === emp._id ? 'Restoring…' : 'Restore'}
                        </button>
                        {isSuperadmin && (
                          <button
                            onClick={(e) => openHardDelete(emp, e)}
                            title="Delete permanently"
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-red-400 hover:bg-red-900/30"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="p-1 rounded hover:bg-white/5 disabled:opacity-30"><ChevronLeft size={18} /></button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="p-1 rounded hover:bg-white/5 disabled:opacity-30"><ChevronRight size={18} /></button>
          </div>
        </div>
      )}

      <DeleteModal
        isOpen={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError('') }}
        onConfirm={confirmHardDelete}
        type="hard"
        title="Delete Employee Permanently"
        message="This will permanently remove the employee record and delete the linked user account. This cannot be undone."
        itemName={deleteTarget ? empName(deleteTarget) : ''}
        requireReason
        loading={deleting}
      />
    </div>
  )
}
