import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { fetchDepts, createDept, updateDept, deleteDept } from '../store/deptsSlice'
import { Plus, Pencil, Trash2, X, Building2 } from 'lucide-react'

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  code: z.string().min(2, 'Code required').max(10),
  description: z.string().optional(),
})

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl" style={{ backgroundColor: '#1A3A6B' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 rounded-lg text-sm text-white border focus:outline-none transition'
const inputStyle = { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' }

export default function DepartmentsPage() {
  const dispatch = useDispatch()
  const { list: depts, loading } = useSelector((s) => s.depts)
  const { user: me } = useSelector((s) => s.auth)

  const [modal, setModal] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [serverErr, setServerErr] = useState('')

  const isSuperadmin = me?.role === 'SUPERADMIN'

  const form = useForm({ resolver: zodResolver(schema) })

  useEffect(() => { dispatch(fetchDepts()) }, [dispatch])

  const openCreate = () => { setServerErr(''); form.reset({ name: '', code: '', description: '' }); setModal('create') }
  const openEdit = (d) => { setServerErr(''); form.reset({ name: d.name, code: d.code, description: d.description || '' }); setModal({ mode: 'edit', dept: d }) }

  const onSubmit = async (values) => {
    setSubmitting(true); setServerErr('')
    const isEdit = modal?.mode === 'edit'
    const action = isEdit
      ? updateDept({ id: modal.dept._id, ...values })
      : createDept(values)
    const result = await dispatch(action)
    setSubmitting(false)
    const matchFn = isEdit ? updateDept.fulfilled : createDept.fulfilled
    if (matchFn.match(result)) setModal(null)
    else setServerErr(result.payload)
  }

  const onDelete = async () => {
    await dispatch(deleteDept(deleteConfirm._id))
    setDeleteConfirm(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Departments</h2>
          <p className="text-sm text-gray-400 mt-0.5">{depts.length} departments</p>
        </div>
        {isSuperadmin && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: '#1E6FD9' }}>
            <Plus size={16} /> Add Department
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {depts.map((d) => (
            <div key={d._id} className="rounded-2xl p-5 border group" style={{ backgroundColor: '#1A3A6B', borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(30,111,217,0.2)' }}>
                    <Building2 size={20} style={{ color: '#1E6FD9' }} />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{d.name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ backgroundColor: 'rgba(0,198,255,0.15)', color: '#00C6FF' }}>
                      {d.code}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                    <Pencil size={14} />
                  </button>
                  {isSuperadmin && (
                    <button onClick={() => setDeleteConfirm(d)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              {d.description && <p className="text-gray-400 text-xs mt-3 line-clamp-2">{d.description}</p>}
              {d.head && <p className="text-gray-500 text-xs mt-2">Head: {d.head.name}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal && (
        <Modal title={modal === 'create' ? 'Add Department' : 'Edit Department'} onClose={() => setModal(null)}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Name</label>
              <input {...form.register('name')} className={inputCls} style={inputStyle} placeholder="e.g. Sales" />
              {form.formState.errors.name && <p className="text-red-400 text-xs mt-1">{form.formState.errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Code</label>
              <input {...form.register('code')} className={inputCls} style={{ ...inputStyle, textTransform: 'uppercase' }} placeholder="e.g. SALES" />
              {form.formState.errors.code && <p className="text-red-400 text-xs mt-1">{form.formState.errors.code.message}</p>}
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Description <span className="text-gray-500">(optional)</span></label>
              <textarea {...form.register('description')} rows={3} className={inputCls} style={inputStyle} placeholder="Brief description..." />
            </div>
            {serverErr && <p className="text-red-400 text-sm">{serverErr}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
              <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-60" style={{ backgroundColor: '#1E6FD9' }}>
                {submitting ? 'Saving...' : modal === 'create' ? 'Create' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <Modal title="Delete Department" onClose={() => setDeleteConfirm(null)}>
          <p className="text-gray-300 mb-6">
            Delete <span className="text-white font-semibold">{deleteConfirm.name}</span> department? This cannot be undone.
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
