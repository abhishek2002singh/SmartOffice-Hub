import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { hrApi } from '../../../api/hr.api'
import { Banknote, Play, CheckCircle, Download, Eye } from 'lucide-react'

const inp = "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none"

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December']
const STATUS_COLOR = {
  draft:      'bg-yellow-500/20 text-yellow-300',
  processed:  'bg-blue-500/20 text-blue-300',
  disbursed:  'bg-green-500/20 text-green-300',
}

function fmtCur(n) { return `₹${Number(n || 0).toLocaleString('en-IN')}` }
function fmtDate(d) { return d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—' }

function RunCard({ run, onDisburse, onBankFile, onView }) {
  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-white">{MONTHS[run.month]} {run.year}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLOR[run.status]}`}>{run.status}</span>
            <span className="text-xs text-gray-400">{run.totalEmployees} employees · {fmtCur(run.totalAmount)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onView(run._id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-white/5 text-gray-300 hover:text-white">
            <Eye size={12} /> View
          </button>
          {run.status === 'processed' && (
            <>
              <button onClick={() => onDisburse(run._id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ backgroundColor: '#10B981', color: '#fff' }}>
                <CheckCircle size={12} /> Mark Disbursed
              </button>
              <button onClick={() => onBankFile(run._id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-white/5 text-gray-300 hover:text-white">
                <Download size={12} /> Bank File
              </button>
            </>
          )}
          {run.status === 'disbursed' && (
            <button onClick={() => onBankFile(run._id)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-white/5 text-gray-300 hover:text-white">
              <Download size={12} /> Bank File
            </button>
          )}
        </div>
      </div>
      {run.processedAt && <p className="text-xs text-gray-500 mt-2">Processed: {fmtDate(run.processedAt)} by {run.processedBy?.name || '—'}</p>}
      {run.disbursedAt && <p className="text-xs text-gray-500">Disbursed: {fmtDate(run.disbursedAt)}</p>}
    </div>
  )
}

function PayslipModal({ runId, onClose }) {
  const [run, setRun] = useState(null)
  const [payslips, setPayslips] = useState([])

  useEffect(() => {
    hrApi.getPayrollRun(runId).then(r => {
      setRun(r.data.data.run)
      setPayslips(r.data.data.payslips)
    }).catch(() => {})
  }, [runId])

  const downloadPDF = async (slipId) => {
    try {
      const r = await hrApi.getPayslipPDF(slipId)
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
      const a = document.createElement('a'); a.href = url; a.download = `payslip_${slipId}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch (_) {}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-3xl rounded-xl overflow-hidden flex flex-col max-h-[80vh]" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <p className="font-semibold text-white">{run ? `${MONTHS[run.month]} ${run.year} Payslips` : 'Loading…'}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
        </div>
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                {['Employee', 'Paid Days', 'LOP', 'Gross', 'Deductions', 'Net Pay', ''].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs text-gray-400 font-semibold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payslips.map(p => (
                <tr key={p._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-2">
                    <p className="text-white text-sm font-medium">{p.employeeId?.firstName} {p.employeeId?.lastName}</p>
                    <p className="text-xs font-mono" style={{ color: '#00C6FF' }}>{p.employeeId?.employeeCode}</p>
                  </td>
                  <td className="px-4 py-2 text-gray-300">{p.paidDays}/{p.workingDays}</td>
                  <td className="px-4 py-2 text-red-400">{p.lopDays}</td>
                  <td className="px-4 py-2 text-gray-300">{`₹${(p.grossEarnings||0).toLocaleString('en-IN')}`}</td>
                  <td className="px-4 py-2 text-red-400">{`₹${(p.totalDeductions||0).toLocaleString('en-IN')}`}</td>
                  <td className="px-4 py-2 text-green-400 font-bold">{`₹${(p.netPay||0).toLocaleString('en-IN')}`}</td>
                  <td className="px-4 py-2">
                    <button onClick={() => downloadPDF(p._id)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                      <Download size={12} /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function PayrollRunPage() {
  const navigate = useNavigate()
  const now = new Date()
  const [runs, setRuns] = useState([])
  const [year, setYear] = useState(now.getFullYear())
  const [form, setForm] = useState({ month: now.getMonth() + 1, year: now.getFullYear() })
  const [processing, setProcessing] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [viewId, setViewId] = useState(null)

  const load = async () => {
    try { const r = await hrApi.listPayrollRuns({ year }); setRuns(r.data.data.runs) } catch (_) {}
  }
  useEffect(() => { load() }, [year])

  const handleProcess = async () => {
    setProcessing(true); setMsg({ type: '', text: '' })
    try {
      await hrApi.processPayroll(form)
      setMsg({ type: 'success', text: `Payroll for ${MONTHS[form.month]} ${form.year} processed successfully.` })
      await load()
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error?.message || 'Processing failed' })
    } finally { setProcessing(false) }
  }

  const handleDisburse = async (id) => {
    if (!confirm('Mark this payroll as disbursed? This cannot be undone.')) return
    try { await hrApi.disbursePayroll(id); await load() } catch (_) {}
  }

  const handleBankFile = async (id) => {
    try {
      const r = await hrApi.getBankFile(id)
      const url = URL.createObjectURL(new Blob([r.data], { type: 'text/csv' }))
      const a = document.createElement('a'); a.href = url; a.download = `bank_file_${id}.csv`; a.click()
      URL.revokeObjectURL(url)
    } catch (_) {}
  }

  return (
    <div className="p-6 space-y-6" style={{ color: '#fff' }}>
      <div className="flex items-center gap-3">
        <Banknote size={22} style={{ color: '#1E6FD9' }} />
        <h1 className="text-xl font-bold">Payroll Runs</h1>
      </div>

      {/* Process new payroll */}
      <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="font-semibold text-white">Process Payroll</p>
        <div className="flex items-center gap-3">
          <select className={inp} value={form.month} onChange={e => setForm(f => ({ ...f, month: +e.target.value }))}>
            {MONTHS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <input type="number" className={inp + ' w-28'} value={form.year} onChange={e => setForm(f => ({ ...f, year: +e.target.value }))} min={2024} />
          <button onClick={handleProcess} disabled={processing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
            <Play size={14} /> {processing ? 'Processing…' : 'Run Payroll'}
          </button>
        </div>
        {msg.text && (
          <p className={`text-sm ${msg.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{msg.text}</p>
        )}
      </div>

      {/* Year filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Filter by year:</span>
        <div className="flex gap-1 items-center bg-white/5 rounded-lg px-3 py-1.5">
          <button onClick={() => setYear(y => y - 1)} className="text-gray-400 hover:text-white px-1">←</button>
          <span className="text-sm font-semibold text-white px-2">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="text-gray-400 hover:text-white px-1">→</button>
        </div>
      </div>

      {/* Run list */}
      <div className="space-y-3">
        {runs.map(r => (
          <RunCard key={r._id} run={r} onDisburse={handleDisburse} onBankFile={handleBankFile} onView={setViewId} />
        ))}
        {runs.length === 0 && (
          <div className="rounded-xl p-10 text-center text-gray-400" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
            No payroll runs for {year}
          </div>
        )}
      </div>

      {viewId && <PayslipModal runId={viewId} onClose={() => setViewId(null)} />}
    </div>
  )
}
