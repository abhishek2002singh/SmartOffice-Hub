import { useState, useEffect } from 'react'
import { hrApi } from '../../../api/hr.api'
import { Target, Plus, Pencil, Trash2 } from 'lucide-react'

const inp = "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none w-full"

const ROLES = ['TEAM_MEMBER', 'DEPT_HEAD', 'SUBADMIN', 'ADMIN', 'SUPERADMIN']
const EMPTY = { name: '', description: '', applicableRoles: [], measurableUnits: '', weightagePercent: 0 }

function KRAForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleRole = (role) => setForm(f => ({
    ...f,
    applicableRoles: f.applicableRoles.includes(role)
      ? f.applicableRoles.filter(r => r !== role)
      : [...f.applicableRoles, role],
  }))

  const submit = async () => {
    if (!form.name) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="rounded-xl p-5 space-y-4 mb-4" style={{ backgroundColor: 'rgba(30,111,217,0.08)', border: '1px solid rgba(30,111,217,0.3)' }}>
      <h3 className="font-semibold text-white">{initial ? 'Edit KRA' : 'New KRA'}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">KRA Name</label>
          <input className={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Lead Conversion Rate" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Description</label>
          <input className={inp} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What this KRA measures…" />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Measurable Units</label>
          <input className={inp} value={form.measurableUnits} onChange={e => set('measurableUnits', e.target.value)} placeholder="e.g. % or tasks/month" />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Default Weightage (%)</label>
          <input type="number" className={inp} value={form.weightagePercent} onChange={e => set('weightagePercent', +e.target.value)} min={0} max={100} />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">Applicable Roles</label>
        <div className="flex flex-wrap gap-2">
          {ROLES.map(role => (
            <label key={role} className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
              <input type="checkbox"
                checked={form.applicableRoles.includes(role)}
                onChange={() => toggleRole(role)}
                className="accent-blue-500" />
              {role.replace('_', ' ')}
            </label>
          ))}
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={submit} disabled={saving || !form.name}
          className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: '#10B981', color: '#fff' }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-gray-300">Cancel</button>
      </div>
    </div>
  )
}

export default function KRAMasterPage() {
  const [kras, setKRAs] = useState([])
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = async () => {
    try { const r = await hrApi.listKRAs(); setKRAs(r.data.data.kras) } catch (_) {}
  }
  useEffect(() => { load() }, [])

  const handleCreate = async (form) => {
    try { await hrApi.createKRA(form); setAdding(false); await load() } catch (_) {}
  }
  const handleUpdate = async (form) => {
    try { await hrApi.updateKRA(editing._id, form); setEditing(null); await load() } catch (_) {}
  }
  const handleDelete = async (id) => {
    if (!confirm('Delete this KRA?')) return
    try { await hrApi.deleteKRA(id); await load() } catch (_) {}
  }

  return (
    <div className="p-6 space-y-6" style={{ color: '#fff' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target size={22} style={{ color: '#1E6FD9' }} />
          <h1 className="text-xl font-bold">KRA Master</h1>
        </div>
        <button onClick={() => { setAdding(true); setEditing(null) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
          <Plus size={14} /> Add KRA
        </button>
      </div>

      {adding  && <KRAForm onSave={handleCreate} onCancel={() => setAdding(false)} />}
      {editing && <KRAForm initial={editing} onSave={handleUpdate} onCancel={() => setEditing(null)} />}

      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              {['KRA', 'Units', 'Weightage', 'Applicable Roles', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-semibold uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {kras.map(k => (
              <tr key={k._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{k.name}</p>
                  {k.description && <p className="text-xs text-gray-500 mt-0.5">{k.description}</p>}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{k.measurableUnits || '—'}</td>
                <td className="px-4 py-3 text-white font-medium">{k.weightagePercent}%</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(k.applicableRoles || []).map(r => (
                      <span key={r} className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-blue-500/10 text-blue-300">{r.replace('_', ' ')}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(k)} className="p-1 text-gray-400 hover:text-white"><Pencil size={13} /></button>
                    <button onClick={() => handleDelete(k._id)} className="p-1 text-gray-400 hover:text-red-400"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {kras.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No KRAs defined</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
