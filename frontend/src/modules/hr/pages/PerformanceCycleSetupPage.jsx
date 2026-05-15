import { useState, useEffect } from 'react'
import { hrApi } from '../../../api/hr.api'
import { RefreshCw, Plus, Pencil } from 'lucide-react'

const inp = "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none w-full"

const STATUS_COLOR = {
  planned:    'bg-gray-500/20 text-gray-300',
  active:     'bg-green-500/20 text-green-300',
  in_review:  'bg-yellow-500/20 text-yellow-300',
  completed:  'bg-blue-500/20 text-blue-300',
}

const STATUSES = ['planned', 'active', 'in_review', 'completed']
const TYPES    = ['quarterly', 'half_yearly', 'annual']

const EMPTY = { name: '', type: 'quarterly', startDate: '', endDate: '' }

function CycleForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ? {
    name: initial.name, type: initial.type,
    startDate: initial.startDate?.slice(0, 10),
    endDate:   initial.endDate?.slice(0, 10),
    status:    initial.status,
  } : EMPTY)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.name || !form.startDate || !form.endDate) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="rounded-xl p-5 space-y-4 mb-4" style={{ backgroundColor: 'rgba(30,111,217,0.08)', border: '1px solid rgba(30,111,217,0.3)' }}>
      <h3 className="font-semibold text-white">{initial ? 'Edit Cycle' : 'New Performance Cycle'}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Cycle Name</label>
          <input className={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Q2 2026 Review" />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Type</label>
          <select className={inp} value={form.type} onChange={e => set('type', e.target.value)}>
            {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
        </div>
        {initial && (
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Status</label>
            <select className={inp} value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Start Date</label>
          <input type="date" className={inp} value={form.startDate} onChange={e => set('startDate', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">End Date</label>
          <input type="date" className={inp} value={form.endDate} onChange={e => set('endDate', e.target.value)} />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={submit} disabled={saving || !form.name || !form.startDate || !form.endDate}
          className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: '#10B981', color: '#fff' }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-gray-300">Cancel</button>
      </div>
    </div>
  )
}

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—' }

export default function PerformanceCycleSetupPage() {
  const [cycles, setCycles] = useState([])
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = async () => {
    try { const r = await hrApi.listCycles(); setCycles(r.data.data.cycles) } catch (_) {}
  }
  useEffect(() => { load() }, [])

  const handleCreate = async (form) => {
    try { await hrApi.createCycle(form); setAdding(false); await load() } catch (_) {}
  }
  const handleUpdate = async (form) => {
    try { await hrApi.updateCycle(editing._id, form); setEditing(null); await load() } catch (_) {}
  }

  return (
    <div className="p-6 space-y-6" style={{ color: '#fff' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RefreshCw size={22} style={{ color: '#1E6FD9' }} />
          <h1 className="text-xl font-bold">Performance Cycles</h1>
        </div>
        <button onClick={() => { setAdding(true); setEditing(null) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
          <Plus size={14} /> New Cycle
        </button>
      </div>

      {adding  && <CycleForm onSave={handleCreate} onCancel={() => setAdding(false)} />}
      {editing && <CycleForm initial={editing} onSave={handleUpdate} onCancel={() => setEditing(null)} />}

      <div className="space-y-3">
        {cycles.map(c => (
          <div key={c._id} className="rounded-xl p-5 flex items-center justify-between" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <div className="flex items-center gap-3">
                <p className="font-semibold text-white">{c.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${STATUS_COLOR[c.status]}`}>{c.status.replace('_', ' ')}</span>
                <span className="text-xs text-gray-500 capitalize">{c.type.replace('_', ' ')}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{fmtDate(c.startDate)} → {fmtDate(c.endDate)}</p>
            </div>
            <button onClick={() => setEditing(c)} className="p-1 text-gray-400 hover:text-white">
              <Pencil size={14} />
            </button>
          </div>
        ))}
        {cycles.length === 0 && (
          <div className="rounded-xl p-10 text-center text-gray-400" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
            No performance cycles set up
          </div>
        )}
      </div>
    </div>
  )
}
