import { useState, useEffect } from 'react'
import { hrApi } from '../../../api/hr.api'
import { FileText, Download } from 'lucide-react'

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December']

const STATUS_COLOR = {
  draft:     'bg-yellow-500/20 text-yellow-300',
  processed: 'bg-blue-500/20 text-blue-300',
  disbursed: 'bg-green-500/20 text-green-300',
}

function fmtCur(n) { return `₹${Number(n || 0).toLocaleString('en-IN')}` }

export default function MyPayslipsPage() {
  const [payslips, setPayslips] = useState([])
  const [selected, setSelected] = useState(null)
  const [downloading, setDownloading] = useState(null)

  useEffect(() => {
    hrApi.listMyPayslips()
      .then(r => setPayslips(r.data.data.payslips))
      .catch(() => {})
  }, [])

  const download = async (id, month, year) => {
    setDownloading(id)
    try {
      const r = await hrApi.getPayslipPDF(id)
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `payslip_${year}_${String(month).padStart(2, '0')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (_) {}
    setDownloading(null)
  }

  return (
    <div className="p-6 space-y-6" style={{ color: '#fff' }}>
      <div className="flex items-center gap-3">
        <FileText size={22} style={{ color: '#1E6FD9' }} />
        <h1 className="text-xl font-bold">My Payslips</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {payslips.map(p => (
          <div key={p._id}
            className="rounded-xl p-4 cursor-pointer transition-all hover:border-blue-500/40"
            style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}
            onClick={() => setSelected(selected?._id === p._id ? null : p)}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-white">{MONTHS[p.month]} {p.year}</p>
                <span className={`text-xs px-2 py-0.5 rounded font-medium mt-0.5 inline-block ${STATUS_COLOR[p.payrollRunId?.status] || ''}`}>
                  {p.payrollRunId?.status || 'processed'}
                </span>
              </div>
              <button
                onClick={e => { e.stopPropagation(); download(p._id, p.month, p.year) }}
                disabled={downloading === p._id}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
                <Download size={12} />
                {downloading === p._id ? '…' : 'PDF'}
              </button>
            </div>

            <div className="flex justify-between text-sm border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Paid Days</p>
                <p className="font-medium text-white mt-0.5">{p.paidDays}/{p.workingDays}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Gross</p>
                <p className="font-medium text-white mt-0.5">{fmtCur(p.grossEarnings)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Deductions</p>
                <p className="font-medium text-red-400 mt-0.5">{fmtCur(p.totalDeductions)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Net Pay</p>
                <p className="text-xl font-bold mt-0.5" style={{ color: '#10B981' }}>{fmtCur(p.netPay)}</p>
              </div>
            </div>

            {selected?._id === p._id && (
              <div className="mt-3 space-y-1 border-t pt-3 text-xs text-gray-300" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex justify-between"><span>Basic</span><span>{fmtCur(p.basicEarned)}</span></div>
                <div className="flex justify-between"><span>HRA</span><span>{fmtCur(p.hraEarned)}</span></div>
                {(p.allowancesBreakdown || []).map(a => (
                  <div key={a.name} className="flex justify-between"><span>{a.name}</span><span>{fmtCur(a.amount)}</span></div>
                ))}
                {p.bonusAmount > 0 && <div className="flex justify-between text-yellow-400"><span>Bonus</span><span>{fmtCur(p.bonusAmount)}</span></div>}
                {p.reimbursementAmount > 0 && <div className="flex justify-between text-yellow-400"><span>Reimbursements</span><span>{fmtCur(p.reimbursementAmount)}</span></div>}
                <div className="flex justify-between border-t pt-1 text-white font-semibold" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <span>Gross Earnings</span><span>{fmtCur(p.grossEarnings)}</span>
                </div>
                {p.pfEmployee > 0 && <div className="flex justify-between text-red-400"><span>PF (Employee)</span><span>– {fmtCur(p.pfEmployee)}</span></div>}
                {p.esiEmployee > 0 && <div className="flex justify-between text-red-400"><span>ESI (Employee)</span><span>– {fmtCur(p.esiEmployee)}</span></div>}
                {p.tdsAmount > 0 && <div className="flex justify-between text-red-400"><span>TDS</span><span>– {fmtCur(p.tdsAmount)}</span></div>}
                <div className="flex justify-between border-t pt-1 font-bold" style={{ borderColor: 'rgba(255,255,255,0.06)', color: '#10B981' }}>
                  <span>Net Pay</span><span>{fmtCur(p.netPay)}</span>
                </div>
              </div>
            )}
          </div>
        ))}
        {payslips.length === 0 && (
          <div className="col-span-2 rounded-xl p-10 text-center text-gray-400" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
            No payslips yet
          </div>
        )}
      </div>
    </div>
  )
}
