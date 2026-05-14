import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { hrApi } from '../../../api/hr.api'
import { TrendingUp, Plus, ArrowLeft } from 'lucide-react'

const inp = "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none w-full"

function fmtCur(n) { return `₹${Number(n || 0).toLocaleString('en-IN')}` }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-IN') : '—' }

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function AssignForm({ employeeId, onDone }) {
  const [structures, setStructures] = useState([])
  const [form, setForm] = useState({ structureId: '', ctc: '', effectiveFrom: '', revisedReason: '' })
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    hrApi.listSalaryStructures().then(r => setStructures(r.data.data.structures)).catch(() => {})
  }, [])

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    setPreview(null)
  }

  const calcPreview = () => {
    const s = structures.find(x => x._id === form.structureId)
    if (!s || !form.ctc) return
    const monthlyCtc = form.ctc / 12
    const basic = +(monthlyCtc * s.basicPercent / 100).toFixed(2)
    const hra   = +(basic * s.hraPercent / 100).toFixed(2)
    const allowances = s.allowances.map(a => ({
      name: a.name, amount: +(a.isPercent ? basic * a.value / 100 : a.value).toFixed(2)
    }))
    const gross = +(basic + hra + allowances.reduce((x, a) => x + a.amount, 0)).toFixed(2)
    const pf    = +(Math.min(basic, 15000) * 0.12).toFixed(2)
    const esi   = gross <= 21000 ? +(gross * 0.0075).toFixed(2) : 0
    const net   = +(gross - pf - esi).toFixed(2)
    setPreview({ basic, hra, allowances, gross, pf, esi, net })
  }

  const submit = async () => {
    if (!form.structureId || !form.ctc || !form.effectiveFrom) { setErr('All fields required'); return }
    setSaving(true); setErr('')
    try {
      await hrApi.assignSalary(employeeId, { ...form, ctc: +form.ctc })
      onDone()
    } catch (e) {
      setErr(e.response?.data?.error?.message || 'Failed to assign salary')
    } finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: 'rgba(30,111,217,0.08)', border: '1px solid rgba(30,111,217,0.3)' }}>
      <h3 className="font-semibold text-white">Assign / Revise Salary</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Salary Structure</label>
          <select className={inp} value={form.structureId} onChange={e => set('structureId', e.target.value)}>
            <option value="">Select structure…</option>
            {structures.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Annual CTC (₹)</label>
          <input type="number" className={inp} value={form.ctc} onChange={e => set('ctc', e.target.value)} placeholder="e.g. 360000" min={0} />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Effective From</label>
          <input type="date" className={inp} value={form.effectiveFrom} onChange={e => set('effectiveFrom', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Revision Reason</label>
          <input className={inp} value={form.revisedReason} onChange={e => set('revisedReason', e.target.value)} placeholder="Annual appraisal, promotion…" />
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <button onClick={calcPreview} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-gray-300 hover:text-white">
          Preview Breakdown
        </button>
        <button onClick={submit} disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: '#10B981', color: '#fff' }}>
          {saving ? 'Saving…' : 'Assign Salary'}
        </button>
      </div>

      {err && <p className="text-red-400 text-sm">{err}</p>}

      {preview && (
        <div className="mt-3 p-4 rounded-xl" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Monthly Breakdown Preview</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              ['Basic', preview.basic],
              ['HRA', preview.hra],
              ...preview.allowances.map(a => [a.name, a.amount]),
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between text-gray-300">
                <span>{label}</span>
                <span className="text-white font-medium">{fmtCur(val)}</span>
              </div>
            ))}
            <div className="flex justify-between text-green-400 font-semibold col-span-2 border-t pt-1" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <span>Gross Monthly</span>
              <span>{fmtCur(preview.gross)}</span>
            </div>
            <div className="flex justify-between text-red-400 text-xs col-span-2">
              <span>PF (12% of basic)</span>
              <span>– {fmtCur(preview.pf)}</span>
            </div>
            {preview.esi > 0 && (
              <div className="flex justify-between text-red-400 text-xs col-span-2">
                <span>ESI (0.75% of gross)</span>
                <span>– {fmtCur(preview.esi)}</span>
              </div>
            )}
            <div className="flex justify-between text-blue-300 font-bold col-span-2 border-t pt-1" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <span>Net Monthly (approx)</span>
              <span>{fmtCur(preview.net)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function EmployeeSalaryPage() {
  const { id } = useParams()
  const [emp, setEmp] = useState(null)
  const [history, setHistory] = useState([])
  const [adding, setAdding] = useState(false)
  const [form16, setForm16] = useState(null)
  const [fy, setFy] = useState('')

  const load = async () => {
    try {
      const [er, hr] = await Promise.all([hrApi.getEmployee(id), hrApi.getSalaryHistory(id)])
      setEmp(er.data.data.employee)
      setHistory(hr.data.data.history)
    } catch (_) {}
  }
  useEffect(() => { load() }, [id])

  const handleForm16 = async () => {
    if (!fy) return
    try {
      const r = await hrApi.getForm16(id, fy)
      setForm16(r.data.data)
    } catch (_) {}
  }

  if (!emp) return <div className="p-6 text-gray-400">Loading…</div>

  const active = history.find(h => h.isActive)

  return (
    <div className="p-6 space-y-6" style={{ color: '#fff' }}>
      <div className="flex items-center gap-3">
        <Link to={`/hr/employees/${id}`} className="text-gray-400 hover:text-white"><ArrowLeft size={20} /></Link>
        <TrendingUp size={22} style={{ color: '#1E6FD9' }} />
        <h1 className="text-xl font-bold">{emp.firstName} {emp.lastName} — Salary</h1>
        <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(0,198,255,0.1)', color: '#00C6FF' }}>{emp.employeeCode}</span>
      </div>

      {/* Current Salary Card */}
      {active ? (
        <div className="rounded-xl p-5" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-white">Current Salary</p>
            <p className="text-xs text-gray-400">Effective {fmtDate(active.effectiveFrom)}</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Annual CTC', value: fmtCur(active.ctc) },
              { label: 'Gross Monthly', value: fmtCur(active.grossMonthly) },
              { label: 'Net Monthly', value: fmtCur(active.netMonthly) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg p-3" style={{ backgroundColor: 'rgba(30,111,217,0.08)' }}>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-xl font-bold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl p-6 text-center text-gray-400" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
          No salary assigned yet
        </div>
      )}

      {/* Assign / Revise */}
      {adding
        ? <AssignForm employeeId={id} onDone={() => { setAdding(false); load() }} />
        : (
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
            <Plus size={14} /> {active ? 'Revise Salary' : 'Assign Salary'}
          </button>
        )
      }

      {/* History */}
      {history.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="font-semibold text-white text-sm">Salary History</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                {['Structure', 'Annual CTC', 'Gross Monthly', 'Net Monthly', 'Effective From', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs text-gray-400 font-semibold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-2 text-gray-300">{h.structureId?.name || '—'}</td>
                  <td className="px-4 py-2 text-white font-medium">{fmtCur(h.ctc)}</td>
                  <td className="px-4 py-2 text-gray-300">{fmtCur(h.grossMonthly)}</td>
                  <td className="px-4 py-2 text-gray-300">{fmtCur(h.netMonthly)}</td>
                  <td className="px-4 py-2 text-gray-400">{fmtDate(h.effectiveFrom)}</td>
                  <td className="px-4 py-2">
                    {h.isActive
                      ? <span className="text-xs px-2 py-0.5 rounded font-medium bg-green-500/20 text-green-300">Active</span>
                      : <span className="text-xs px-2 py-0.5 rounded font-medium bg-gray-500/20 text-gray-400">Past</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form 16 Placeholder */}
      <div className="rounded-xl p-5 space-y-3" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="font-semibold text-white text-sm">Form 16 Estimate (Display Only)</p>
        <div className="flex gap-3 items-center">
          <input className={inp + ' w-36'} placeholder="FY e.g. 2025-26" value={fy} onChange={e => setFy(e.target.value)} />
          <button onClick={handleForm16} className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 text-gray-300 hover:text-white">
            Generate
          </button>
        </div>
        {form16 && (
          <div className="grid grid-cols-3 gap-3 mt-2">
            {[
              { label: 'Total Gross Earnings', value: fmtCur(form16.totalGrossEarnings) },
              { label: 'Total TDS Deducted', value: fmtCur(form16.totalTDSDeducted) },
              { label: 'Total PF Contributed', value: fmtCur(form16.totalPFContributed) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-lg font-bold text-white">{value}</p>
              </div>
            ))}
          </div>
        )}
        {form16 && <p className="text-xs text-yellow-500">{form16.note}</p>}
      </div>
    </div>
  )
}
