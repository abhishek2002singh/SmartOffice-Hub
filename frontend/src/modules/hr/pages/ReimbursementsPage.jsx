import { useState, useEffect } from 'react'
import { hrApi } from '../../../api/hr.api'
import { Receipt, Plus, Check, X } from 'lucide-react'
import { useSelector } from 'react-redux'

const inp = "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none w-full"

const TYPES = ['travel', 'food', 'internet', 'medical', 'other']
const STATUS_COLOR = {
  pending:  'bg-yellow-500/20 text-yellow-300',
  approved: 'bg-green-500/20 text-green-300',
  rejected: 'bg-red-500/20 text-red-300',
  paid:     'bg-blue-500/20 text-blue-300',
}

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-IN') : '—' }
function fmtCur(n) { return `₹${Number(n || 0).toLocaleString('en-IN')}` }

const ROLE_ORDER = ['TEAM_MEMBER', 'DEPT_HEAD', 'SUBADMIN', 'ADMIN', 'SUPERADMIN']

export default function ReimbursementsPage() {
  const { user } = useSelector(s => s.auth)
  const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(user?.role)
  const isDeptHead = ROLE_ORDER.indexOf(user?.role) >= ROLE_ORDER.indexOf('DEPT_HEAD')

  const [items, setItems] = useState([])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ type: 'travel', amount: '', billDate: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [reviewForm, setReviewForm] = useState({})
  const [err, setErr] = useState('')

  const load = async () => {
    try {
      const r = await hrApi.listReimbursements({ status: statusFilter })
      setItems(r.data.data.reimbursements)
    } catch (_) {}
  }
  useEffect(() => { load() }, [statusFilter])

  const submit = async () => {
    if (!form.amount || !form.billDate) { setErr('Amount and bill date required'); return }
    setSaving(true); setErr('')
    try {
      await hrApi.submitReimbursement({ ...form, amount: +form.amount })
      setAdding(false)
      setForm({ type: 'travel', amount: '', billDate: '', description: '' })
      await load()
    } catch (e) {
      setErr(e.response?.data?.error?.message || 'Failed to submit')
    } finally { setSaving(false) }
  }

  const review = async (id, status) => {
    const notes = reviewForm[id] || ''
    try {
      await hrApi.reviewReimbursement(id, { status, reviewerNotes: notes })
      await load()
    } catch (_) {}
  }

  return (
    <div className="p-6 space-y-6" style={{ color: '#fff' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Receipt size={22} style={{ color: '#1E6FD9' }} />
          <h1 className="text-xl font-bold">Reimbursements</h1>
        </div>
        <button onClick={() => setAdding(a => !a)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
          <Plus size={14} /> Submit Request
        </button>
      </div>

      {/* Submit form */}
      {adding && (
        <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: 'rgba(30,111,217,0.08)', border: '1px solid rgba(30,111,217,0.3)' }}>
          <h3 className="font-semibold text-white">New Reimbursement Request</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Type</label>
              <select className={inp} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Amount (₹)</label>
              <input type="number" className={inp} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} min={0} />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Bill Date</label>
              <input type="date" className={inp} value={form.billDate} onChange={e => setForm(f => ({ ...f, billDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Description</label>
              <input className={inp} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Cab to client office" />
            </div>
          </div>
          {err && <p className="text-red-400 text-sm">{err}</p>}
          <div className="flex gap-3">
            <button onClick={submit} disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: '#10B981', color: '#fff' }}>
              {saving ? 'Submitting…' : 'Submit'}
            </button>
            <button onClick={() => setAdding(false)} className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-gray-300">Cancel</button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['pending', 'approved', 'rejected', 'paid'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${statusFilter === s ? 'text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}
            style={statusFilter === s ? { backgroundColor: '#1E6FD9' } : {}}>
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              {(isAdmin ? ['Employee', 'Type', 'Amount', 'Bill Date', 'Description', 'Status', 'Action'] :
                         ['Type', 'Amount', 'Bill Date', 'Description', 'Status']).map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-semibold uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <p className="text-white text-sm">{item.employeeId?.firstName} {item.employeeId?.lastName}</p>
                    <p className="text-xs font-mono" style={{ color: '#00C6FF' }}>{item.employeeId?.employeeCode}</p>
                  </td>
                )}
                <td className="px-4 py-3 text-gray-300 capitalize">{item.type}</td>
                <td className="px-4 py-3 text-white font-medium">{fmtCur(item.amount)}</td>
                <td className="px-4 py-3 text-gray-400">{fmtDate(item.billDate)}</td>
                <td className="px-4 py-3 text-gray-400 max-w-xs truncate">{item.description || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLOR[item.status]}`}>{item.status}</span>
                </td>
                {isAdmin && item.status === 'pending' && (
                  <td className="px-4 py-3">
                    <div className="flex gap-2 items-center">
                      <input
                        className="px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white outline-none w-28"
                        placeholder="Notes…"
                        value={reviewForm[item._id] || ''}
                        onChange={e => setReviewForm(f => ({ ...f, [item._id]: e.target.value }))}
                      />
                      <button onClick={() => review(item._id, 'approved')} className="p-1 text-green-400 hover:text-green-300"><Check size={14} /></button>
                      <button onClick={() => review(item._id, 'rejected')} className="p-1 text-red-400 hover:text-red-300"><X size={14} /></button>
                    </div>
                  </td>
                )}
                {isAdmin && item.status !== 'pending' && <td className="px-4 py-3 text-xs text-gray-500">{item.reviewerNotes || '—'}</td>}
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 7 : 5} className="px-4 py-10 text-center text-gray-400">
                  No {statusFilter} reimbursements
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
