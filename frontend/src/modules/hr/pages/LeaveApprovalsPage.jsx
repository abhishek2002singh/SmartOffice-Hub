import { useState, useEffect } from 'react'
import { hrApi } from '../../../api/hr.api'
import { CheckSquare, Check, X, Clock } from 'lucide-react'

const STATUS_COLOR = {
  pending:   'bg-yellow-500/20 text-yellow-300',
  approved:  'bg-green-500/20  text-green-300',
  rejected:  'bg-red-500/20    text-red-400',
  cancelled: 'bg-gray-500/20   text-gray-400',
}

export default function LeaveApprovalsPage() {
  const [requests, setRequests] = useState([])
  const [filterStatus, setFilter] = useState('pending')
  const [loading, setLoading]   = useState(false)
  const [reviewing, setReviewing] = useState({})  // id → true
  const [commentMap, setCommentMap] = useState({})

  const load = async () => {
    setLoading(true)
    try {
      const r = await hrApi.getTeamLeaveRequests({ status: filterStatus || undefined })
      setRequests(r.data.data.requests)
    } catch (_) {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterStatus])

  const review = async (id, status) => {
    setReviewing(prev => ({ ...prev, [id]: true }))
    try {
      await hrApi.reviewLeave(id, { status, reviewerComments: commentMap[id] || '' })
      await load()
    } catch (_) {}
    finally { setReviewing(prev => ({ ...prev, [id]: false })) }
  }

  return (
    <div className="p-6 space-y-6" style={{ color: '#fff' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckSquare size={22} style={{ color: '#1E6FD9' }} />
          <h1 className="text-xl font-bold">Leave Approvals</h1>
          {filterStatus === 'pending' && requests.length > 0 && (
            <span className="px-2 py-0.5 rounded text-xs font-bold text-white" style={{ backgroundColor: '#FF6B00' }}>{requests.length} pending</span>
          )}
        </div>
        <div className="flex gap-2">
          {['pending','approved','rejected',''].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${filterStatus === s ? 'text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}
              style={filterStatus === s ? { backgroundColor: '#1E6FD9' } : {}}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <CheckSquare size={40} className="mx-auto mb-3 text-gray-600" />
            <p>No {filterStatus || ''} requests</p>
          </div>
        ) : (
          <div className="divide-y" style={{ '--tw-divide-opacity': 1 }}>
            {requests.map(r => {
              const emp = r.employeeId
              const name = emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown'
              return (
                <div key={r._id} className="p-5 space-y-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{name}</p>
                        <span className="text-xs text-gray-500 font-mono">{emp?.employeeCode}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[r.status]}`}>{r.status}</span>
                      </div>
                      <p className="text-sm text-gray-300 mt-1">
                        <b>{r.leaveTypeId?.name}</b> ({r.leaveTypeId?.code}) — {r.days} day{r.days !== 1 ? 's' : ''}
                        {r.isHalfDay && <span className="ml-1 text-blue-300">({r.halfDaySession} half day)</span>}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(r.startDate).toLocaleDateString('en-IN')} → {new Date(r.endDate).toLocaleDateString('en-IN')}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 italic">"{r.reason}"</p>
                    </div>
                    <div className="text-xs text-gray-500 text-right">
                      <p>Applied: {new Date(r.createdAt).toLocaleDateString('en-IN')}</p>
                      {r.reviewedBy && <p className="mt-0.5">Reviewed by: {r.reviewedBy.name}</p>}
                    </div>
                  </div>

                  {r.status === 'pending' && (
                    <div className="space-y-2">
                      <input
                        className="w-full px-3 py-1.5 rounded bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none"
                        placeholder="Comments (optional)…"
                        value={commentMap[r._id] || ''}
                        onChange={e => setCommentMap(m => ({ ...m, [r._id]: e.target.value }))}
                      />
                      <div className="flex gap-2">
                        <button
                          disabled={reviewing[r._id]}
                          onClick={() => review(r._id, 'approved')}
                          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50"
                          style={{ backgroundColor: '#10B981', color: '#fff' }}>
                          <Check size={12} /> Approve
                        </button>
                        <button
                          disabled={reviewing[r._id]}
                          onClick={() => review(r._id, 'rejected')}
                          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-red-500/20 text-red-300 disabled:opacity-50">
                          <X size={12} /> Reject
                        </button>
                      </div>
                    </div>
                  )}
                  {r.reviewerComments && <p className="text-xs text-orange-300">Note: {r.reviewerComments}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
