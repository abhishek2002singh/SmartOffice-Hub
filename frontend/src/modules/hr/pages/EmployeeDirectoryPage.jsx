import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { hrApi } from '../../../api/hr.api'
import DeleteModal from '../../../components/DeleteModal'
import {
  Users, Search, Plus, ChevronLeft, ChevronRight,
  Trash2, Archive,
} from 'lucide-react'

const STATUS_COLORS = {
  probation:   'bg-yellow-500/20 text-yellow-300',
  confirmed:   'bg-green-500/20  text-green-300',
  resigned:    'bg-orange-500/20 text-orange-300',
  terminated:  'bg-red-500/20    text-red-300',
  relieved:    'bg-blue-500/20   text-blue-300',
  absconding:  'bg-red-700/20    text-red-400',
}

const INITIALS_BG = ['#1E6FD9', '#FF6B00', '#00C6FF', '#1A3A6B', '#6366F1', '#10B981']
const getColor = (name) => INITIALS_BG[(name?.charCodeAt(0) || 0) % INITIALS_BG.length]

export default function EmployeeDirectoryPage() {
  const { user: me } = useSelector(s => s.auth)
  const isAdmin      = ['ADMIN', 'SUPERADMIN'].includes(me?.role)
  const isSuperadmin = me?.role === 'SUPERADMIN'
  const canDelete    = isAdmin

  const [employees, setEmployees] = useState([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [loading, setLoading]     = useState(false)
  const [filters, setFilters]     = useState({
    q: '', departmentId: '', designation: '',
    employmentStatus: '', employmentType: '', officeLocation: '',
  })

  // Checkbox selection
  const [selectedIds, setSelectedIds] = useState([])
  const allSelected = employees.length > 0 && employees.every(e => selectedIds.includes(e._id))

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState(null)  // { emp, type }
  const [deleting, setDeleting]         = useState(false)
  const [deleteError, setDeleteError]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 20, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) }
      const { data } = await hrApi.listEmployees(params)
      setEmployees(data.data.employees)
      setTotal(data.data.total)
    } catch (_) {}
    finally { setLoading(false) }
  }, [page, filters])

  useEffect(() => { load() }, [load])

  const set = (k, v) => { setFilters(f => ({ ...f, [k]: v })); setPage(1) }

  const totalPages = Math.ceil(total / 20)

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : employees.map(e => e._id))
  }

  const openDelete = (emp, type, e) => {
    e.preventDefault()
    setDeleteError('')
    setDeleteTarget({ emp, type })
  }

  const confirmDelete = async ({ confirmText, reason }) => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError('')
    try {
      if (deleteTarget.type === 'hard') {
        await hrApi.hardDeleteEmployee(deleteTarget.emp._id, { confirmText, reason })
      } else {
        await hrApi.softDeleteEmployee(deleteTarget.emp._id)
      }
      setDeleteTarget(null)
      setSelectedIds(prev => prev.filter(id => id !== deleteTarget.emp._id))
      load()
    } catch (err) {
      setDeleteError(err.response?.data?.error?.message || 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const bulkSoftDelete = async () => {
    if (!selectedIds.length) return
    setDeleting(true)
    try {
      await hrApi.bulkSoftDeleteEmployees(selectedIds)
      setSelectedIds([])
      load()
    } catch (err) {
      setDeleteError(err.response?.data?.error?.message || 'Bulk delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const empName = (emp) => [emp.firstName, emp.lastName].filter(Boolean).join(' ')

  return (
    <div className="p-6 space-y-6" style={{ color: '#fff' }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Users size={22} style={{ color: '#1E6FD9' }} />
          <h1 className="text-xl font-bold">Employee Directory</h1>
          <span className="text-sm px-2 py-0.5 rounded" style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>{total}</span>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              to="/hr/employees/archive"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-300 border border-white/10 hover:bg-white/5"
            >
              <Archive size={14} /> Archive
            </Link>
          )}
          <Link
            to="/hr/employees/onboard"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: '#1E6FD9', color: '#fff' }}
          >
            <Plus size={16} /> Onboard Employee
          </Link>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.length > 0 && canDelete && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-4"
          style={{ backgroundColor: 'rgba(30,111,217,0.12)', border: '1px solid rgba(30,111,217,0.4)' }}>
          <span className="text-sm text-blue-300">{selectedIds.length} selected</span>
          <button
            onClick={bulkSoftDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: '#c2410c' }}
          >
            <Trash2 size={14} /> Archive Selected
          </button>
          <button onClick={() => setSelectedIds([])} className="text-sm text-gray-400 hover:text-white ml-auto">
            Clear selection
          </button>
        </div>
      )}

      {deleteError && (
        <div className="rounded-lg px-4 py-3 text-sm text-red-300"
          style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
          {deleteError}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="relative col-span-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none"
            placeholder="Search by name, email, code…"
            value={filters.q}
            onChange={e => set('q', e.target.value)}
          />
        </div>
        {[
          { key: 'employmentStatus', label: 'Status', opts: ['probation','confirmed','resigned','terminated','relieved','absconding'] },
          { key: 'employmentType',   label: 'Type',   opts: ['Full Time','Part Time','Internship','Freelance','Contract'] },
          { key: 'officeLocation',   label: 'Location', opts: ['Delhi','Remote','WFH'] },
        ].map(({ key, label, opts }) => (
          <select
            key={key}
            value={filters[key]}
            onChange={e => set(key, e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white outline-none"
          >
            <option value="">All {label}</option>
            {opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
        <input
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none"
          placeholder="Designation"
          value={filters.designation}
          onChange={e => set('designation', e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading…</div>
        ) : employees.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No employees found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                {canDelete && (
                  <th className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="rounded accent-blue-500"
                    />
                  </th>
                )}
                {['Employee', 'Code', 'Designation', 'Department', 'Type', 'Status', 'Joined', ''].map(h => (
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
                    {canDelete && (
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(emp._id)}
                          onChange={() => toggleSelect(emp._id)}
                          className="rounded accent-blue-500"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <Link to={`/hr/employees/${emp._id}`} className="flex items-center gap-3 hover:opacity-80">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ backgroundColor: getColor(name) }}
                        >
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white">{name}</p>
                          <p className="text-xs text-gray-400">{emp.officialEmail || emp.personalEmail}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-300 font-mono text-xs">{emp.employeeCode}</td>
                    <td className="px-4 py-3 text-gray-300">{emp.designation || '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{emp.departmentId?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{emp.employmentType}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[emp.employmentStatus] || 'bg-gray-500/20 text-gray-300'}`}>
                        {emp.employmentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {emp.dateOfJoining ? new Date(emp.dateOfJoining).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {canDelete && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => openDelete(emp, 'soft', e)}
                            title="Archive employee"
                            className="p-1.5 rounded hover:bg-white/10 text-orange-400 hover:text-orange-300"
                          >
                            <Trash2 size={14} />
                          </button>
                          {isSuperadmin && (
                            <button
                              onClick={(e) => openDelete(emp, 'hard', e)}
                              title="Delete permanently"
                              className="p-1.5 rounded hover:bg-white/10 text-red-500 hover:text-red-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
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
        onConfirm={confirmDelete}
        type={deleteTarget?.type === 'hard' ? 'hard' : 'soft'}
        title={deleteTarget?.type === 'hard' ? 'Delete Employee Permanently' : 'Archive Employee'}
        message={
          deleteTarget?.type === 'hard'
            ? 'This will permanently remove the employee record and delete the linked user account. This cannot be undone.'
            : 'This will archive the employee and deactivate their login. You can restore them later.'
        }
        itemName={deleteTarget ? empName(deleteTarget.emp) : ''}
        requireReason={deleteTarget?.type === 'hard'}
        loading={deleting}
      />
    </div>
  )
}
