import { useState, useEffect } from 'react'
import { hrApi } from '../../../api/hr.api'
import { Settings, Plus, Pencil, Trash2, Check, X } from 'lucide-react'

const EMPTY = { name: '', code: '', annualQuota: 0, halfDayAllowed: true, carryForwardEnabled: false, maxCarryForward: 0, requireDocuments: false, applicableGender: 'all', monthlyAccrualEnabled: false }

const inp = "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none w-full"

function LeaveTypeRow({ lt, onEdit, onDelete }) {
  return (
    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <td className="px-4 py-3">
        <p className="text-sm font-semibold text-white">{lt.name}</p>
        <p className="text-xs font-mono" style={{ color: '#00C6FF' }}>{lt.code}</p>
      </td>
      <td className="px-4 py-3 text-center text-white font-bold">{lt.annualQuota}</td>
      <td className="px-4 py-3 text-center">
        {lt.halfDayAllowed ? <Check size={14} className="text-green-400 mx-auto" /> : <X size={14} className="text-gray-600 mx-auto" />}
      </td>
      <td className="px-4 py-3 text-center">
        {lt.carryForwardEnabled
          ? <span className="text-green-400 text-xs">Yes ({lt.maxCarryForward} max)</span>
          : <X size={14} className="text-gray-600 mx-auto" />}
      </td>
      <td className="px-4 py-3 text-center">
        {lt.requireDocuments ? <Check size={14} className="text-blue-400 mx-auto" /> : <X size={14} className="text-gray-600 mx-auto" />}
      </td>
      <td className="px-4 py-3 text-center text-gray-300 text-xs capitalize">{lt.applicableGender}</td>
      <td className="px-4 py-3">
        <div className="flex gap-2 justify-end">
          <button onClick={() => onEdit(lt)} className="p-1 text-gray-400 hover:text-white"><Pencil size={13} /></button>
          <button onClick={() => onDelete(lt._id)} className="p-1 text-gray-400 hover:text-red-400"><Trash2 size={13} /></button>
        </div>
      </td>
    </tr>
  )
}

function LeaveTypeForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="rounded-xl p-5 space-y-4 mb-4" style={{ backgroundColor: 'rgba(30,111,217,0.08)', border: '1px solid rgba(30,111,217,0.3)' }}>
      <h3 className="font-semibold text-white">{initial ? 'Edit Leave Type' : 'New Leave Type'}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Name</label>
          <input className={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Casual Leave" />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Code</label>
          <input className={inp} value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="CL" disabled={!!initial} />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Annual Quota (days)</label>
          <input type="number" className={inp} value={form.annualQuota} onChange={e => set('annualQuota', +e.target.value)} min={0} />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Applicable Gender</label>
          <select className={inp} value={form.applicableGender} onChange={e => set('applicableGender', e.target.value)}>
            <option value="all">All</option>
            <option value="male">Male only</option>
            <option value="female">Female only</option>
          </select>
        </div>
        {form.carryForwardEnabled && (
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Max Carry Forward</label>
            <input type="number" className={inp} value={form.maxCarryForward} onChange={e => set('maxCarryForward', +e.target.value)} min={0} />
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-4">
        {[
          { key: 'halfDayAllowed', label: 'Half Day Allowed' },
          { key: 'carryForwardEnabled', label: 'Carry Forward' },
          { key: 'requireDocuments', label: 'Require Documents' },
          { key: 'monthlyAccrualEnabled', label: 'Monthly Accrual' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={!!form[key]} onChange={e => set(key, e.target.checked)} className="accent-blue-500" />
            {label}
          </label>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={submit} disabled={saving || !form.name || !form.code}
          className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: '#10B981', color: '#fff' }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-gray-300">Cancel</button>
      </div>
    </div>
  )
}

export default function LeaveTypeConfigPage() {
  const [leaveTypes, setLeaveTypes] = useState([])
  const [adding, setAdding]     = useState(false)
  const [editing, setEditing]   = useState(null)

  const load = async () => {
    try { const r = await hrApi.listLeaveTypes(); setLeaveTypes(r.data.data.leaveTypes) } catch (_) {}
  }
  useEffect(() => { load() }, [])

  const handleCreate = async (form) => {
    try { await hrApi.createLeaveType(form); setAdding(false); await load() } catch (_) {}
  }

  const handleUpdate = async (form) => {
    try { await hrApi.updateLeaveType(editing._id, form); setEditing(null); await load() } catch (_) {}
  }

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this leave type?')) return
    await hrApi.deleteLeaveType(id)
    await load()
  }

  return (
    <div className="p-6 space-y-6" style={{ color: '#fff' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings size={22} style={{ color: '#1E6FD9' }} />
          <h1 className="text-xl font-bold">Leave Types Configuration</h1>
        </div>
        <button onClick={() => { setAdding(true); setEditing(null) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
          <Plus size={14} /> Add Leave Type
        </button>
      </div>

      {adding && <LeaveTypeForm onSave={handleCreate} onCancel={() => setAdding(false)} />}
      {editing && <LeaveTypeForm initial={editing} onSave={handleUpdate} onCancel={() => setEditing(null)} />}

      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              {['Leave Type', 'Quota/yr', 'Half Day', 'Carry Fwd', 'Docs Req', 'Gender', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-semibold uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leaveTypes.map(lt => (
              <LeaveTypeRow key={lt._id} lt={lt} onEdit={setEditing} onDelete={handleDelete} />
            ))}
            {leaveTypes.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No leave types configured</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
