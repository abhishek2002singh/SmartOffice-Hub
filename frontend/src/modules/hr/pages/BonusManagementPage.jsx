import { useState, useEffect } from 'react'
import { hrApi } from '../../../api/hr.api'
import { Gift, Plus, Pencil, Trash2 } from 'lucide-react'

const inp = "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none w-full"

const TYPES  = ['performance', 'festival', 'referral', 'other']
const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December']
const STATUS_COLOR = {
  planned:             'bg-yellow-500/20 text-yellow-300',
  included_in_payroll: 'bg-blue-500/20 text-blue-300',
  disbursed:           'bg-green-500/20 text-green-300',
}

function fmtCur(n) { return `₹${Number(n || 0).toLocaleString('en-IN')}` }

const EMPTY = { employeeId: '', type: 'performance', amount: '', reason: '', payableMonth: new Date().getMonth() + 1, payableYear: new Date().getFullYear() }

function BonusForm({ initial, employees, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.employeeId || !form.amount) return
    setSaving(true)
    await onSave({ ...form, amount: +form.amount, payableMonth: +form.payableMonth, payableYear: +form.payableYear })
    setSaving(false)
  }

  return (
    <div className="rounded-xl p-5 space-y-4 mb-4" style={{ backgroundColor: 'rgba(30,111,217,0.08)', border: '1px solid rgba(30,111,217,0.3)' }}>
      <h3 className="font-semibold text-white">{initial ? 'Edit Bonus' : 'Add Bonus'}</h3>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Employee</label>
          <select className={inp} value={form.employeeId} onChange={e => set('employeeId', e.target.value)}>
            <option value="">Select employee…</option>
            {employees.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Type</label>
          <select className={inp} value={form.type} onChange={e => set('type', e.target.value)}>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Amount (₹)</label>
          <input type="number" className={inp} value={form.amount} onChange={e => set('amount', e.target.value)} min={0} />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Payable Month</label>
          <select className={inp} value={form.payableMonth} onChange={e => set('payableMonth', +e.target.value)}>
            {MONTHS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Year</label>
          <input type="number" className={inp} value={form.payableYear} onChange={e => set('payableYear', +e.target.value)} min={2024} />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Reason</label>
          <input className={inp} value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="e.g. Diwali bonus" />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={submit} disabled={saving || !form.employeeId || !form.amount}
          className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: '#10B981', color: '#fff' }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-gray-300">Cancel</button>
      </div>
    </div>
  )
}

export default function BonusManagementPage() {
  const [bonuses, setBonuses] = useState([])
  const [employees, setEmployees] = useState([])
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear())
  const [statusFilter, setStatusFilter] = useState('')

  const load = async () => {
    try {
      const params = { year: yearFilter }
      if (statusFilter) params.status = statusFilter
      const [br, er] = await Promise.all([hrApi.listBonuses(params), hrApi.listEmployees({ limit: 200 })])
      setBonuses(br.data.data.bonuses)
      setEmployees(er.data.data.employees)
    } catch (_) {}
  }
  useEffect(() => { load() }, [yearFilter, statusFilter])

  const handleCreate = async (form) => {
    try { await hrApi.createBonus(form); setAdding(false); await load() } catch (_) {}
  }
  const handleUpdate = async (form) => {
    try { await hrApi.updateBonus(editing._id, form); setEditing(null); await load() } catch (_) {}
  }
  const handleDelete = async (id) => {
    if (!confirm('Delete this bonus?')) return
    try { await hrApi.deleteBonus(id); await load() } catch (_) {}
  }

  return (
    <div className="p-6 space-y-6" style={{ color: '#fff' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Gift size={22} style={{ color: '#1E6FD9' }} />
          <h1 className="text-xl font-bold">Bonus Management</h1>
        </div>
        <button onClick={() => { setAdding(true); setEditing(null) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
          <Plus size={14} /> Add Bonus
        </button>
      </div>

      {adding  && <BonusForm employees={employees} onSave={handleCreate} onCancel={() => setAdding(false)} />}
      {editing && <BonusForm initial={editing} employees={employees} onSave={handleUpdate} onCancel={() => setEditing(null)} />}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 items-center bg-white/5 rounded-lg px-3 py-1.5">
          <button onClick={() => setYearFilter(y => y - 1)} className="text-gray-400 hover:text-white px-1">←</button>
          <span className="text-sm font-semibold text-white px-2">{yearFilter}</span>
          <button onClick={() => setYearFilter(y => y + 1)} className="text-gray-400 hover:text-white px-1">→</button>
        </div>
        <div className="flex gap-2">
          {['', 'planned', 'included_in_payroll', 'disbursed'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${statusFilter === s ? 'text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}
              style={statusFilter === s ? { backgroundColor: '#1E6FD9' } : {}}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              {['Employee', 'Type', 'Amount', 'Payable', 'Reason', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-semibold uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bonuses.map(b => (
              <tr key={b._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td className="px-4 py-3">
                  <p className="text-white text-sm">{b.employeeId?.firstName} {b.employeeId?.lastName}</p>
                  <p className="text-xs font-mono" style={{ color: '#00C6FF' }}>{b.employeeId?.employeeCode}</p>
                </td>
                <td className="px-4 py-3 text-gray-300 capitalize">{b.type}</td>
                <td className="px-4 py-3 text-yellow-400 font-bold">{fmtCur(b.amount)}</td>
                <td className="px-4 py-3 text-gray-400">{MONTHS[b.payableMonth]} {b.payableYear}</td>
                <td className="px-4 py-3 text-gray-400 max-w-xs truncate">{b.reason || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLOR[b.status]}`}>
                    {b.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {b.status === 'planned' && (
                    <div className="flex gap-2">
                      <button onClick={() => setEditing(b)} className="p-1 text-gray-400 hover:text-white"><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(b._id)} className="p-1 text-gray-400 hover:text-red-400"><Trash2 size={13} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {bonuses.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No bonuses found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
