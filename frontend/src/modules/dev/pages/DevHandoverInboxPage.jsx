import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { devApi } from '../../../api/dev.api'
import DevAcceptHandoverModal from '../components/DevAcceptHandoverModal'

const STATUS_COLORS = {
  pending_review:      'bg-yellow-900/30 text-yellow-300 border-yellow-700',
  accepted:            'bg-green-900/30 text-green-300 border-green-700',
  clarification_needed:'bg-orange-900/30 text-orange-300 border-orange-700',
  rejected:            'bg-red-900/30 text-red-300 border-red-700',
}

export default function DevHandoverInboxPage() {
  const navigate = useNavigate()
  const [handovers, setHandovers]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [filterStatus, setFilter]     = useState('pending_review')
  const [acceptTarget, setAcceptTarget] = useState(null)
  const [clarifyTarget, setClarifyTarget] = useState(null)
  const [clarifyNote, setClarifyNote] = useState('')
  const [saving, setSaving]           = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = filterStatus ? { status: filterStatus } : {}
      const r = await devApi.listHandovers(params)
      setHandovers(r.data.data.handovers || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [filterStatus])

  useEffect(() => { load() }, [load])

  const submitClarification = async (handoverId) => {
    if (!clarifyNote.trim()) return
    setSaving(true)
    try {
      await devApi.requestClarification(handoverId, { clarificationNotes: clarifyNote.trim() })
      setClarifyTarget(null)
      setClarifyNote('')
      await load()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const pendingCount = handovers.filter(h => h.status === 'pending_review' && h.isOverdue).length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dev Handover Inbox</h1>
          <p className="text-sm text-gray-400">CRM won deals → development projects</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-lg px-4 py-2">
            <span className="text-red-400 text-lg">⚠️</span>
            <span className="text-sm text-red-300">{pendingCount} overdue — needs review</span>
          </div>
        )}
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {[
          { key: 'pending_review', label: 'Pending' },
          { key: 'clarification_needed', label: 'Needs Clarification' },
          { key: 'accepted', label: 'Accepted' },
          { key: '', label: 'All' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${filterStatus === f.key ? 'bg-[#1E6FD9] border-blue-600 text-white' : 'border-blue-900 text-gray-400 hover:text-white'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Handover cards */}
      {loading ? (
        <div className="text-center text-gray-400 py-16">Loading handovers...</div>
      ) : handovers.length === 0 ? (
        <div className="text-center text-gray-400 py-16">No handovers found.</div>
      ) : (
        <div className="space-y-4">
          {handovers.map(h => (
            <div key={h._id} className={`bg-[#1A3A6B] border rounded-xl p-5 space-y-3 ${h.isOverdue ? 'border-red-700/50' : 'border-blue-900'}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">
                      {h.clientId?.companyName || h.clientId?.name || 'Unknown Client'}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLORS[h.status]}`}>
                      {h.status?.replace('_', ' ')}
                    </span>
                    {h.isOverdue && (
                      <span className="text-xs bg-red-900/30 text-red-400 border border-red-700 px-2 py-0.5 rounded">
                        {h.ageDays}d overdue
                      </span>
                    )}
                  </div>
                  {h.serviceTicketId && (
                    <p className="text-xs text-gray-400 mt-0.5">Ticket: {h.serviceTicketId.title}</p>
                  )}
                </div>
                <div className="text-xs text-gray-500 shrink-0">
                  {new Date(h.handoverDate || h.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>

              {h.originalRequirement && (
                <div className="bg-[#0A1628] rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Original Requirement</p>
                  <p className="text-sm text-gray-300">{h.originalRequirement}</p>
                </div>
              )}

              {h.agreedTimeline && (
                <p className="text-xs text-gray-400">Timeline: <span className="text-gray-300">{h.agreedTimeline}</span></p>
              )}

              {h.clarificationNotes && (
                <div className="bg-orange-900/20 border border-orange-800/30 rounded-lg p-3">
                  <p className="text-xs text-orange-300 font-medium">Clarification Requested</p>
                  <p className="text-sm text-gray-300 mt-1">{h.clarificationNotes}</p>
                </div>
              )}

              {h.salesPerson && (
                <p className="text-xs text-gray-500">Sales: {h.salesPerson.name} ({h.salesPerson.email})</p>
              )}

              {/* Actions */}
              {(h.status === 'pending_review' || h.status === 'clarification_needed') && (
                <div className="flex gap-2 pt-2 border-t border-blue-900">
                  <button onClick={() => setAcceptTarget(h)}
                    className="px-4 py-1.5 bg-green-700 hover:bg-green-600 text-white text-sm rounded-lg transition-colors">
                    Accept & Create Project
                  </button>
                  {h.status === 'pending_review' && (
                    <button onClick={() => { setClarifyTarget(h._id); setClarifyNote('') }}
                      className="px-4 py-1.5 bg-orange-700 hover:bg-orange-600 text-white text-sm rounded-lg transition-colors">
                      Need Clarification
                    </button>
                  )}
                </div>
              )}

              {h.status === 'accepted' && h.projectId && (
                <button onClick={() => navigate(`/dev/projects/${h.projectId._id || h.projectId}`)}
                  className="text-sm text-[#00C6FF] hover:underline">
                  View Project →
                </button>
              )}

              {/* Clarification input */}
              {clarifyTarget === h._id && (
                <div className="pt-2 space-y-2">
                  <textarea
                    value={clarifyNote}
                    onChange={e => setClarifyNote(e.target.value)}
                    placeholder="What clarification is needed from sales team?"
                    rows={3}
                    className="w-full bg-[#0A1628] border border-orange-800/40 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => submitClarification(h._id)} disabled={saving}
                      className="px-4 py-1.5 bg-orange-700 hover:bg-orange-600 text-white text-sm rounded-lg disabled:opacity-50">
                      {saving ? 'Sending...' : 'Send to Sales'}
                    </button>
                    <button onClick={() => setClarifyTarget(null)} className="text-sm text-gray-400 hover:text-white px-3 py-1.5">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {acceptTarget && (
        <DevAcceptHandoverModal
          handover={acceptTarget}
          onClose={() => setAcceptTarget(null)}
          onAccepted={(projectId) => { setAcceptTarget(null); load(); navigate(`/dev/projects/${projectId}`) }}
        />
      )}
    </div>
  )
}
