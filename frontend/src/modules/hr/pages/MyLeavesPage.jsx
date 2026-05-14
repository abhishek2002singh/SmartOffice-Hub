import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { hrApi } from '../../../api/hr.api'
import { Palmtree, Plus, X, Check, Clock } from 'lucide-react'

const STATUS_COLOR = {
  pending:   'bg-yellow-500/20 text-yellow-300',
  approved:  'bg-green-500/20  text-green-300',
  rejected:  'bg-red-500/20    text-red-400',
  cancelled: 'bg-gray-500/20   text-gray-400',
  withdrawn: 'bg-gray-500/20   text-gray-400',
}

const inp = "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500 w-full"

export default function MyLeavesPage() {
  const { user }  = useSelector(s => s.auth)
  const [employee, setEmployee] = useState(null)
  const [balances, setBalances] = useState([])
  const [requests, setRequests] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm] = useState({ leaveTypeId: '', startDate: '', endDate: '', reason: '', isHalfDay: false, halfDaySession: 'morning' })
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')
  const [calDays, setCalDays] = useState(null)

  const loadEmployee = async () => {
    try { const r = await hrApi.getMyProfile(); setEmployee(r.data.data.employee) } catch (_) {}
  }

  const loadBalances = async (empId) => {
    try {
      const r = await hrApi.getLeaveBalances(empId)
      setBalances(r.data.data.balances)
    } catch (_) {}
  }

  const loadRequests = async () => {
    try { const r = await hrApi.getMyLeaveRequests(); setRequests(r.data.data.requests) } catch (_) {}
  }

  const loadLeaveTypes = async () => {
    try { const r = await hrApi.listLeaveTypes(); setLeaveTypes(r.data.data.leaveTypes) } catch (_) {}
  }

  useEffect(() => {
    loadEmployee()
    loadLeaveTypes()
    loadRequests()
  }, [])

  useEffect(() => {
    if (employee?._id) loadBalances(employee._id)
  }, [employee])

  // Auto-calculate working days when dates change
  useEffect(() => {
    if (!form.startDate || !form.endDate || form.isHalfDay) { setCalDays(form.isHalfDay ? 0.5 : null); return }
    const start = new Date(form.startDate)
    const end   = new Date(form.endDate)
    if (start > end) { setCalDays(0); return }
    let count = 0
    const cur = new Date(start)
    while (cur <= end) {
      const dow = cur.getDay()
      if (dow !== 0 && dow !== 6) count++
      cur.setDate(cur.getDate() + 1)
    }
    setCalDays(count)
  }, [form.startDate, form.endDate, form.isHalfDay])

  const submitLeave = async () => {
    setSubmitting(true); setMsg('')
    try {
      await hrApi.applyLeave(form)
      setMsg('Leave request submitted!')
      setShowForm(false)
      setForm({ leaveTypeId: '', startDate: '', endDate: '', reason: '', isHalfDay: false, halfDaySession: 'morning' })
      await loadRequests()
      if (employee?._id) await loadBalances(employee._id)
    } catch (err) {
      setMsg(err.response?.data?.error?.message || 'Submission failed')
    } finally { setSubmitting(false) }
  }

  const cancelRequest = async (id) => {
    try {
      await hrApi.cancelLeave(id)
      await loadRequests()
    } catch (_) {}
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto" style={{ color: '#fff' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Palmtree size={22} style={{ color: '#1E6FD9' }} />
          <h1 className="text-xl font-bold">My Leaves</h1>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
          <Plus size={15} /> Apply Leave
        </button>
      </div>

      {msg && <div className={`px-4 py-3 rounded-lg text-sm ${msg.includes('success') ? 'bg-green-500/10 text-green-300 border border-green-500/20' : 'bg-red-500/10 text-red-300 border border-red-500/20'}`}>{msg}</div>}

      {/* Apply Leave Form */}
      {showForm && (
        <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 className="font-semibold text-white">New Leave Request</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Leave Type</label>
              <select className={inp} value={form.leaveTypeId} onChange={e => setForm(f => ({ ...f, leaveTypeId: e.target.value }))}>
                <option value="">Select type</option>
                {leaveTypes.map(lt => <option key={lt._id} value={lt._id}>{lt.name} ({lt.code})</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3 pt-5">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={form.isHalfDay} onChange={e => setForm(f => ({ ...f, isHalfDay: e.target.checked }))} />
                Half Day
              </label>
              {form.isHalfDay && (
                <select className="px-2 py-1 rounded bg-white/5 border border-white/10 text-sm text-white outline-none" value={form.halfDaySession} onChange={e => setForm(f => ({ ...f, halfDaySession: e.target.value }))}>
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">From Date</label>
              <input type="date" className={inp} value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">{form.isHalfDay ? 'Date' : 'To Date'}</label>
              <input type="date" className={inp} value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} min={form.startDate} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Reason</label>
              <textarea className={inp} rows={2} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Brief reason for leave…" />
            </div>
          </div>
          {calDays !== null && (
            <p className="text-sm text-blue-300">Working days: <b>{calDays}</b> {calDays === 0 && <span className="text-red-400">(no working days in range)</span>}</p>
          )}
          <div className="flex gap-3">
            <button onClick={submitLeave} disabled={submitting || !form.leaveTypeId || !form.startDate || !form.endDate || !form.reason}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: '#10B981', color: '#fff' }}>
              <Check size={14} />{submitting ? 'Submitting…' : 'Submit Request'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-gray-300 hover:text-white">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Leave Balances */}
      {balances.length > 0 && (
        <div className="rounded-xl p-5" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 className="font-semibold text-white mb-4">Leave Balances — {new Date().getFullYear()}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {balances.map(b => {
              const pct = b.allocated > 0 ? ((b.used / (b.allocated + b.carryForwarded)) * 100) : 0
              return (
                <div key={b._id} className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{b.leaveType?.name}</p>
                      <p className="text-xs text-gray-500">{b.leaveType?.code}</p>
                    </div>
                    <span className="text-lg font-bold" style={{ color: b.remaining > 0 ? '#10B981' : '#EF4444' }}>{b.remaining}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pct > 80 ? '#EF4444' : '#1E6FD9' }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{b.used} used / {b.allocated + b.carryForwarded} total</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Leave History */}
      <div className="rounded-xl" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <h2 className="font-semibold text-white">My Leave Requests</h2>
        </div>
        {requests.length === 0 ? (
          <p className="text-center text-gray-400 py-10">No leave requests yet</p>
        ) : (
          <div className="divide-y" style={{ '--tw-divide-color': 'rgba(255,255,255,0.05)' }}>
            {requests.map(r => (
              <div key={r._id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-white">
                    {r.leaveTypeId?.name} — <span className="text-gray-300">{r.days} day{r.days !== 1 ? 's' : ''}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(r.startDate).toLocaleDateString('en-IN')} → {new Date(r.endDate).toLocaleDateString('en-IN')}
                    {r.isHalfDay && <span className="ml-2 text-blue-300">({r.halfDaySession} half)</span>}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{r.reason}</p>
                  {r.reviewerComments && <p className="text-xs text-orange-300 mt-0.5">Note: {r.reviewerComments}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[r.status]}`}>{r.status}</span>
                  {r.status === 'pending' && (
                    <button onClick={() => cancelRequest(r._id)} className="p-1 text-gray-500 hover:text-red-400">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
