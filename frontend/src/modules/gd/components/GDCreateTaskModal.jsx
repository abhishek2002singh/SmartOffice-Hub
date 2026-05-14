import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { gdApi } from '../../../api/gd.api'
import { clientsApi } from '../../../api/clients.api'

const TYPES     = ['video','reel','image','carousel','poster','thumbnail','banner','other']
const PRIORITIES = ['high','medium','low']
const SOURCE_MODULES = ['direct','dm','other']

export default function GDCreateTaskModal({ onClose, onCreated, prefill = {} }) {
  const [form, setForm] = useState({
    title:        prefill.title || '',
    brief:        prefill.brief || '',
    type:         prefill.type  || 'image',
    priority:     prefill.priority || 'medium',
    client:       prefill.client || '',
    assignedTo:   prefill.assignedTo || '',
    dueDate:      '',
    referenceLinks: '',
    sourceModule: prefill.sourceModule || 'direct',
    sourceTaskId: prefill.sourceTaskId || '',
  })
  const [clients,   setClients]   = useState([])
  const [designers, setDesigners] = useState([])
  const [saving,    setSaving]    = useState(false)
  const [err,       setErr]       = useState('')

  useEffect(() => {
    clientsApi.list({ limit: 200 }).then(r => setClients(r.data.data?.clients || r.data.data || [])).catch(() => {})
    // Fetch users with GD role/dept — fallback: load all users
    fetch('/api/v1/users?limit=200', { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } })
      .then(r => r.json()).then(r => setDesigners(r.data?.users || [])).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErr('')
    if (!form.title.trim() || !form.type || !form.client) {
      setErr('Title, type, and client are required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        referenceLinks: form.referenceLinks.split('\n').map(s => s.trim()).filter(Boolean),
        assignedTo: form.assignedTo || undefined,
        dueDate:    form.dueDate    || undefined,
        sourceTaskId: form.sourceTaskId || undefined,
      }
      await gdApi.createTask(payload)
      onCreated()
    } catch (e) {
      setErr(e.response?.data?.error?.message || 'Failed to create task')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4"
        style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">New GD Task</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-white" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="w-full px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-blue-500"
            placeholder="Task title *"
            value={form.title} onChange={e => set('title', e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <select className="px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-white outline-none"
              value={form.type} onChange={e => set('type', e.target.value)}>
              {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
            <select className="px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-white outline-none"
              value={form.priority} onChange={e => set('priority', e.target.value)}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>

          <select className="w-full px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-white outline-none"
            value={form.client} onChange={e => set('client', e.target.value)}>
            <option value="">Select client *</option>
            {clients.map(c => <option key={c._id} value={c._id}>{c.companyName}</option>)}
          </select>

          <select className="w-full px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-white outline-none"
            value={form.assignedTo} onChange={e => set('assignedTo', e.target.value)}>
            <option value="">Assign to designer (optional)</option>
            {designers.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>

          <input type="date"
            className="w-full px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-white outline-none"
            value={form.dueDate} onChange={e => set('dueDate', e.target.value)}
          />

          <textarea rows={3}
            className="w-full px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none resize-none"
            placeholder="Brief / description (optional)"
            value={form.brief} onChange={e => set('brief', e.target.value)}
          />

          <textarea rows={2}
            className="w-full px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none resize-none"
            placeholder="Reference links (one per line)"
            value={form.referenceLinks} onChange={e => set('referenceLinks', e.target.value)}
          />

          {err && <p className="text-red-400 text-xs">{err}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-xl text-sm border border-white/20 text-gray-300 hover:bg-white/5">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: '#1E6FD9' }}>
              {saving ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
