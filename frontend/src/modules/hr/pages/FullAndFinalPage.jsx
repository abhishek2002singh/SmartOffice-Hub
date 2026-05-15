import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { hrApi } from '../../../api/hr.api'
import { useSelector } from 'react-redux'
import { DollarSign, Plus, Trash2, Check } from 'lucide-react'
import dayjs from 'dayjs'

const inp = "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none w-full"

const STATUS_COLOR = {
  pending:   'bg-yellow-500/20 text-yellow-300',
  approved:  'bg-blue-500/20 text-blue-300',
  disbursed: 'bg-green-500/20 text-green-300',
}

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

export default function FullAndFinalPage() {
  const { id: employeeId } = useParams()
  const { user } = useSelector(s => s.auth)
  const canProcess = ['ADMIN', 'SUPERADMIN'].includes(user?.role)

  const [emp, setEmp]       = useState(null)
  const [fnf, setFnF]       = useState(null)
  const [calc, setCalc]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState({ type: '', text: '' })

  const [form, setForm] = useState({
    pendingSalary: 0, leaveEncashment: 0, gratuity: 0, bonus: 0,
    deductions: [], notes: '',
  })

  useEffect(() => {
    Promise.all([hrApi.getEmployee(employeeId), hrApi.getFnF(employeeId)])
      .then(([er, fr]) => {
        setEmp(er.data.data.employee)
        const existing = fr.data.data.fnf
        if (existing) {
          setFnF(existing)
          setForm({
            pendingSalary:   existing.pendingSalary,
            leaveEncashment: existing.leaveEncashment,
            gratuity:        existing.gratuity,
            bonus:           existing.bonus,
            deductions:      existing.deductions || [],
            notes:           existing.notes || '',
          })
        }
      }).catch(() => {})
      .finally(() => setLoading(false))
  }, [employeeId])

  const calculate = async () => {
    setSaving(true); setMsg({ type: '', text: '' })
    try {
      const r = await hrApi.calculateFnF(employeeId, form)
      setFnF(r.data.data.fnf)
      setCalc(r.data.data.calculated)
      setMsg({ type: 'success', text: 'F&F calculated and saved as draft.' })
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error?.message || 'Failed to calculate' })
    } finally { setSaving(false) }
  }

  const approve = async () => {
    setSaving(true)
    try {
      const r = await hrApi.approveFnF(employeeId)
      setFnF(r.data.data.fnf)
      setMsg({ type: 'success', text: 'F&F approved.' })
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error?.message || 'Failed to approve' })
    } finally { setSaving(false) }
  }

  const disburse = async () => {
    if (!confirm('Mark this F&F as disbursed? Employee will be moved to Relieved status.')) return
    setSaving(true)
    try {
      const r = await hrApi.disburseFnF(employeeId)
      setFnF(r.data.data.fnf)
      setMsg({ type: 'success', text: 'F&F disbursed. Employee marked as relieved.' })
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error?.message || 'Failed to disburse' })
    } finally { setSaving(false) }
  }

  const addDeduction = () => setForm(f => ({ ...f, deductions: [...f.deductions, { description: '', amount: 0 }] }))
  const removeDeduction = (idx) => setForm(f => ({ ...f, deductions: f.deductions.filter((_, i) => i !== idx) }))
  const setDeduction = (idx, k, v) => setForm(f => {
    const arr = [...f.deductions]
    arr[idx] = { ...arr[idx], [k]: v }
    return { ...f, deductions: arr }
  })

  const totalEarnings  = (form.pendingSalary || 0) + (form.leaveEncashment || 0) + (form.gratuity || 0) + (form.bonus || 0)
  const totalDeductions = form.deductions.reduce((s, d) => s + (Number(d.amount) || 0), 0)
  const netPayable      = totalEarnings - totalDeductions

  if (loading) return <div className="p-6 text-gray-500 text-sm">Loading…</div>

  const isEditable = canProcess && (!fnf || fnf.status === 'pending')

  return (
    <div className="p-6 space-y-6 max-w-3xl" style={{ color: '#fff' }}>
      <div className="flex items-center gap-3">
        <DollarSign size={22} style={{ color: '#10B981' }} />
        <h1 className="text-xl font-bold">Full & Final Settlement{emp ? ` — ${emp.firstName} ${emp.lastName}` : ''}</h1>
        {emp && <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(0,198,255,0.1)', color: '#00C6FF' }}>{emp.employeeCode}</span>}
        {fnf && <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLOR[fnf.status]}`}>{fnf.status}</span>}
      </div>

      {emp?.exitInfo?.exitDate && (
        <div className="rounded-xl p-4 grid grid-cols-3 gap-4 text-sm" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div><p className="text-xs text-gray-400 mb-1">Exit Date</p><p className="text-white font-medium">{dayjs(emp.exitInfo.exitDate).format('DD MMM YYYY')}</p></div>
          <div><p className="text-xs text-gray-400 mb-1">Reason</p><p className="text-white font-medium">{emp.exitInfo.exitReason || '—'}</p></div>
          <div><p className="text-xs text-gray-400 mb-1">Joining Date</p><p className="text-white font-medium">{dayjs(emp.dateOfJoining).format('DD MMM YYYY')}</p></div>
        </div>
      )}

      {calc && (
        <div className="rounded-xl p-4 space-y-1 text-xs" style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <p className="text-green-400 font-semibold mb-2">Auto-calculated values (you can override below)</p>
          <p className="text-gray-300">Pending Salary: <span className="text-white">{fmt(calc.pendingSalary)}</span> (pro-rated {dayjs(emp?.exitInfo?.exitDate).date()} days of {dayjs(emp?.exitInfo?.exitDate).daysInMonth()})</p>
          <p className="text-gray-300">Leave Encashment: <span className="text-white">{fmt(calc.leaveEncashment)}</span></p>
          <p className="text-gray-300">Gratuity: <span className="text-white">{fmt(calc.gratuity)}</span> ({calc.yearsOfService} yrs of service{calc.yearsOfService < 5 ? ' — not applicable (<5 yrs)' : ''})</p>
        </div>
      )}

      {/* Earnings */}
      <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="font-semibold text-white text-sm">Earnings</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'pendingSalary',   label: 'Pending Salary' },
            { key: 'leaveEncashment', label: 'Leave Encashment (EL)' },
            { key: 'gratuity',        label: 'Gratuity' },
            { key: 'bonus',           label: 'Pending Bonus' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">{label}</label>
              <input type="number" className={inp} disabled={!isEditable} min={0}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: +e.target.value }))} />
            </div>
          ))}
        </div>
      </div>

      {/* Deductions */}
      <div className="rounded-xl p-5 space-y-3" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between">
          <p className="font-semibold text-white text-sm">Deductions</p>
          {isEditable && (
            <button onClick={addDeduction} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
              <Plus size={12} /> Add
            </button>
          )}
        </div>
        {form.deductions.length === 0 && <p className="text-xs text-gray-600 italic">No deductions</p>}
        {form.deductions.map((d, idx) => (
          <div key={idx} className="flex gap-2">
            <input className={inp + ' text-xs'} placeholder="Description" disabled={!isEditable}
              value={d.description} onChange={e => setDeduction(idx, 'description', e.target.value)} />
            <input type="number" className={`${inp} w-36 text-xs`} placeholder="Amount" disabled={!isEditable} min={0}
              value={d.amount} onChange={e => setDeduction(idx, 'amount', +e.target.value)} />
            {isEditable && (
              <button onClick={() => removeDeduction(idx)} className="px-2 text-red-400 hover:text-red-300"><Trash2 size={13} /></button>
            )}
          </div>
        ))}
      </div>

      {/* Net payable summary */}
      <div className="rounded-xl p-5 space-y-2" style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
        <div className="flex justify-between text-sm text-gray-300">
          <span>Total Earnings</span><span className="font-medium text-white">{fmt(totalEarnings)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-300">
          <span>Total Deductions</span><span className="font-medium text-red-400">- {fmt(totalDeductions)}</span>
        </div>
        <div className="flex justify-between font-bold border-t pt-2 text-base" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <span className="text-green-400">Net Payable</span>
          <span className="text-green-400">{fmt(netPayable)}</span>
        </div>
      </div>

      {/* Notes */}
      {isEditable && (
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Notes</label>
          <textarea className={inp + ' resize-none'} rows={2} value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Any additional notes for HR records…" />
        </div>
      )}

      {msg.text && <p className={`text-sm ${msg.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{msg.text}</p>}

      {/* Action buttons */}
      {canProcess && (
        <div className="flex gap-3">
          {isEditable && (
            <button onClick={calculate} disabled={saving}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
              {saving ? 'Calculating…' : fnf ? 'Recalculate & Save' : 'Calculate F&F'}
            </button>
          )}
          {fnf?.status === 'pending' && (
            <button onClick={approve} disabled={saving}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: '#10B981', color: '#fff' }}>
              {saving ? 'Approving…' : 'Approve F&F'}
            </button>
          )}
          {fnf?.status === 'approved' && (
            <button onClick={disburse} disabled={saving}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: '#FF6B00', color: '#fff' }}>
              {saving ? 'Marking…' : 'Mark as Disbursed'}
            </button>
          )}
        </div>
      )}

      {fnf?.status === 'disbursed' && (
        <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
          <Check size={16} /> Disbursed on {fnf.disbursedAt ? dayjs(fnf.disbursedAt).format('DD MMM YYYY') : '—'}
        </div>
      )}
    </div>
  )
}
