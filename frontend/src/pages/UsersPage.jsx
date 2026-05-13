import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { fetchUsers, createUser, updateUser, deleteUser } from '../store/usersSlice'
import { fetchDepts } from '../store/deptsSlice'
import { Plus, Pencil, Trash2, X, Search } from 'lucide-react'

const ROLES = ['SUPERADMIN', 'ADMIN', 'SUBADMIN', 'DEPT_HEAD', 'TEAM_MEMBER']

const createSchema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Min 6 characters'),
  role: z.enum(ROLES),
  department: z.string().optional(),
  phone: z.string().optional(),
})

const editSchema = z.object({
  name: z.string().min(2, 'Name required'),
  role: z.enum(ROLES),
  department: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean(),
})

const ROLE_COLORS = {
  SUPERADMIN: { bg: 'rgba(255,107,0,0.15)', color: '#FF6B00' },
  ADMIN: { bg: 'rgba(30,111,217,0.2)', color: '#1E6FD9' },
  SUBADMIN: { bg: 'rgba(0,198,255,0.15)', color: '#00C6FF' },
  DEPT_HEAD: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
  TEAM_MEMBER: { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af' },
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl" style={{ backgroundColor: '#1A3A6B' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm text-gray-300 mb-1">{label}</label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 rounded-lg text-sm text-white border focus:outline-none transition'
const inputStyle = { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' }

export default function UsersPage() {
  const dispatch = useDispatch()
  const { list: users, total, loading } = useSelector((s) => s.users)
  const { list: depts } = useSelector((s) => s.depts)
  const { user: me } = useSelector((s) => s.auth)

  const [modal, setModal] = useState(null) // null | 'create' | { mode:'edit', user }
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [serverErr, setServerErr] = useState('')

  useEffect(() => {
    dispatch(fetchUsers())
    dispatch(fetchDepts())
  }, [dispatch])

  useEffect(() => {
    const t = setTimeout(() => dispatch(fetchUsers(search ? { q: search } : {})), 350)
    return () => clearTimeout(t)
  }, [search, dispatch])

  const isSuperadmin = me?.role === 'SUPERADMIN'

  // Create form
  const createForm = useForm({ resolver: zodResolver(createSchema), defaultValues: { role: 'TEAM_MEMBER', isActive: true } })
  const editForm = useForm({ resolver: zodResolver(editSchema) })

  const openCreate = () => { setServerErr(''); createForm.reset({ role: 'TEAM_MEMBER' }); setModal('create') }
  const openEdit = (u) => {
    setServerErr('')
    editForm.reset({ name: u.name, role: u.role, department: u.department?._id || '', phone: u.phone || '', isActive: u.isActive })
    setModal({ mode: 'edit', user: u })
  }

  const onCreateSubmit = async (values) => {
    setSubmitting(true); setServerErr('')
    const result = await dispatch(createUser({ ...values, department: values.department || undefined }))
    setSubmitting(false)
    if (createUser.fulfilled.match(result)) { setModal(null) }
    else setServerErr(result.payload)
  }

  const onEditSubmit = async (values) => {
    setSubmitting(true); setServerErr('')
    const result = await dispatch(updateUser({ id: modal.user._id, ...values, department: values.department || undefined }))
    setSubmitting(false)
    if (updateUser.fulfilled.match(result)) { setModal(null) }
    else setServerErr(result.payload)
  }

  const onDelete = async () => {
    await dispatch(deleteUser(deleteConfirm._id))
    setDeleteConfirm(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Users</h2>
          <p className="text-sm text-gray-400 mt-0.5">{total} total users</p>
        </div>
        {isSuperadmin && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: '#1E6FD9' }}>
            <Plus size={16} /> Add User
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white border focus:outline-none"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }}
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#1A3A6B' }}>
              {['Name', 'Email', 'Role', 'Department', 'Status', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-gray-400 font-medium text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-500">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-500">No users found</td></tr>
            ) : users.map((u, i) => (
              <tr key={u._id} style={{ backgroundColor: i % 2 === 0 ? 'rgba(26,58,107,0.3)' : 'transparent' }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: '#1E6FD9' }}>
                      {u.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-white font-medium">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium" style={ROLE_COLORS[u.role]}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">{u.department?.name || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'text-green-400' : 'text-red-400'}`}
                    style={{ backgroundColor: u.isActive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                      <Pencil size={14} />
                    </button>
                    {isSuperadmin && u.role !== 'SUPERADMIN' && (
                      <button onClick={() => setDeleteConfirm(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {modal === 'create' && (
        <Modal title="Add New User" onClose={() => setModal(null)}>
          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full Name" error={createForm.formState.errors.name?.message}>
                <input {...createForm.register('name')} className={inputCls} style={inputStyle} placeholder="Rahul Sharma" />
              </Field>
              <Field label="Phone" error={createForm.formState.errors.phone?.message}>
                <input {...createForm.register('phone')} className={inputCls} style={inputStyle} placeholder="9999999999" />
              </Field>
            </div>
            <Field label="Email" error={createForm.formState.errors.email?.message}>
              <input {...createForm.register('email')} type="email" className={inputCls} style={inputStyle} placeholder="rahul@ankdigitalmedia.com" />
            </Field>
            <Field label="Password" error={createForm.formState.errors.password?.message}>
              <input {...createForm.register('password')} type="password" className={inputCls} style={inputStyle} placeholder="Min 6 characters" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Role" error={createForm.formState.errors.role?.message}>
                <select {...createForm.register('role')} className={inputCls} style={inputStyle}>
                  {ROLES.map((r) => <option key={r} value={r} style={{ backgroundColor: '#1A3A6B' }}>{r}</option>)}
                </select>
              </Field>
              <Field label="Department">
                <select {...createForm.register('department')} className={inputCls} style={inputStyle}>
                  <option value="" style={{ backgroundColor: '#1A3A6B' }}>None</option>
                  {depts.map((d) => <option key={d._id} value={d._id} style={{ backgroundColor: '#1A3A6B' }}>{d.name}</option>)}
                </select>
              </Field>
            </div>
            {serverErr && <p className="text-red-400 text-sm">{serverErr}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
              <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-60" style={{ backgroundColor: '#1E6FD9' }}>
                {submitting ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {modal?.mode === 'edit' && (
        <Modal title="Edit User" onClose={() => setModal(null)}>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full Name" error={editForm.formState.errors.name?.message}>
                <input {...editForm.register('name')} className={inputCls} style={inputStyle} />
              </Field>
              <Field label="Phone">
                <input {...editForm.register('phone')} className={inputCls} style={inputStyle} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Role" error={editForm.formState.errors.role?.message}>
                <select {...editForm.register('role')} className={inputCls} style={inputStyle}>
                  {ROLES.map((r) => <option key={r} value={r} style={{ backgroundColor: '#1A3A6B' }}>{r}</option>)}
                </select>
              </Field>
              <Field label="Department">
                <select {...editForm.register('department')} className={inputCls} style={inputStyle}>
                  <option value="" style={{ backgroundColor: '#1A3A6B' }}>None</option>
                  {depts.map((d) => <option key={d._id} value={d._id} style={{ backgroundColor: '#1A3A6B' }}>{d.name}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Status">
              <label className="flex items-center gap-2 cursor-pointer">
                <input {...editForm.register('isActive')} type="checkbox" className="w-4 h-4 rounded" />
                <span className="text-sm text-gray-300">Active</span>
              </label>
            </Field>
            {serverErr && <p className="text-red-400 text-sm">{serverErr}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
              <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-60" style={{ backgroundColor: '#1E6FD9' }}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <Modal title="Delete User" onClose={() => setDeleteConfirm(null)}>
          <p className="text-gray-300 mb-6">
            Are you sure you want to delete <span className="text-white font-semibold">{deleteConfirm.name}</span>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
            <button onClick={onDelete} className="px-5 py-2 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: '#ef4444' }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
