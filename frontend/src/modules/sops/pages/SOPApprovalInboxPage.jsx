import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, MessageSquare, Clock, ArrowLeft, Inbox } from 'lucide-react'
import sopApi from '../../../api/sop.api'

function ReviewModal({ approval, onDone, onClose }) {
  const [decision, setDecision]   = useState('')
  const [comments, setComments]   = useState('')
  const [saving, setSaving]       = useState(false)
  const [err, setErr]             = useState('')

  const submit = async () => {
    if (!decision) { setErr('Select a decision'); return }
    setSaving(true); setErr('')
    try {
      await sopApi.reviewApproval(approval.sopId._id, { decision, reviewComments: comments })
      onDone()
    } catch (e) {
      setErr(e.response?.data?.error?.message || 'Failed to submit review')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="rounded-2xl p-6 w-full max-w-md" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.1)' }}>
        <h3 className="text-white font-bold text-lg mb-1">Review SOP</h3>
        <p className="text-gray-400 text-sm mb-4">
          <strong className="text-white">{approval.sopId?.title}</strong> — v{approval.versionNumber}
        </p>

        <div className="flex gap-2 mb-4">
          {[
            { v: 'approved', label: 'Approve', icon: CheckCircle, cls: 'text-green-300 border-green-900' },
            { v: 'changes_requested', label: 'Request Changes', icon: MessageSquare, cls: 'text-yellow-300 border-yellow-900' },
            { v: 'rejected', label: 'Reject', icon: XCircle, cls: 'text-red-400 border-red-900' },
          ].map(({ v, label, icon: Icon, cls }) => (
            <button
              key={v}
              onClick={() => setDecision(v)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-medium transition-all ${cls} ${decision === v ? 'bg-white/10' : 'hover:bg-white/5'}`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        <textarea
          value={comments} onChange={e => setComments(e.target.value)}
          placeholder="Review comments (optional)"
          rows={3}
          className="w-full px-3 py-2 rounded-xl text-sm text-white border resize-none mb-3"
          style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(255,255,255,0.08)' }}
        />

        {err && <p className="text-red-400 text-xs mb-3">{err}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-gray-400 border text-sm" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>Cancel</button>
          <button onClick={submit} disabled={saving || !decision} className="flex-1 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-50" style={{ backgroundColor: '#1E6FD9' }}>
            {saving ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SOPApprovalInboxPage() {
  const navigate = useNavigate()
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading]     = useState(true)
  const [reviewing, setReviewing] = useState(null)

  const fetch = async () => {
    setLoading(true)
    try { const r = await sopApi.getApprovalInbox(); setApprovals(r.data.data.approvals) }
    catch { /* silent */ }
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {reviewing && (
        <ReviewModal
          approval={reviewing}
          onDone={() => { setReviewing(null); fetch() }}
          onClose={() => setReviewing(null)}
        />
      )}

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/sops')} className="text-gray-500 hover:text-white"><ArrowLeft size={18} /></button>
        <h1 className="text-xl font-bold text-white flex-1">Approval Inbox</h1>
        <span className="text-sm text-gray-500">{approvals.length} pending</span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : approvals.length === 0 ? (
        <div className="text-center py-16">
          <Inbox size={40} className="mx-auto text-gray-700 mb-3" />
          <p className="text-gray-500">No pending approvals</p>
          <p className="text-gray-600 text-sm mt-1">All SOPs are reviewed</p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map(app => (
            <div key={app._id} className="p-4 rounded-xl border flex items-center gap-4" style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link to={`/sops/${app.sopId?._id}`} className="text-white font-medium text-sm hover:text-blue-400">
                    {app.sopId?.title}
                  </Link>
                  <span className="text-xs text-gray-500">v{app.versionNumber}</span>
                  {app.sopId?.categoryId && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(30,111,217,0.2)', color: '#00C6FF' }}>
                      {app.sopId.categoryId.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  <Clock size={11} />
                  Submitted by {app.requestedBy?.name} · {new Date(app.requestedAt).toLocaleDateString('en-IN')}
                </div>
              </div>
              <button
                onClick={() => setReviewing(app)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white font-medium shrink-0"
                style={{ backgroundColor: '#1E6FD9' }}
              >
                Review
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
