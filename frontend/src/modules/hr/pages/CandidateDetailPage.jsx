import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { hrApi } from '../../../api/hr.api'

const STATUSES  = ['New', 'Shortlisted', 'Interview Done', 'Selected', 'Rejected', 'On Hold']
const CALLING   = ['Not Called', 'Ringing', 'Busy', 'Not Connected', 'Rejected', 'Switched Off', 'Connected']
const STATUS_COLORS = {
  New: 'bg-blue-900/40 text-blue-300', Shortlisted: 'bg-yellow-900/30 text-yellow-300',
  'Interview Done': 'bg-purple-900/30 text-purple-300', Selected: 'bg-green-900/30 text-green-300',
  Rejected: 'bg-red-900/30 text-red-300', 'On Hold': 'bg-gray-700 text-gray-300',
}
const PROFICIENCY_COLORS = { Expert: 'bg-green-700 text-green-200', Intermediate: 'bg-blue-800 text-blue-200', Beginner: 'bg-gray-700 text-gray-300' }
const RECOMMENDATION_COLORS = {
  proceed: 'text-green-400', next_round: 'text-blue-400',
  hold: 'text-yellow-400', reject: 'text-red-400',
}

export default function CandidateDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [candidate, setCandidate]   = useState(null)
  const [followups, setFollowups]   = useState([])
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState('profile')
  const [saving, setSaving]         = useState(false)

  // Followup form
  const [fupForm, setFupForm] = useState({ scheduledAt: '', notes: '' })
  const [fupSaving, setFupSaving] = useState(false)

  // Interview form
  const [ivForm, setIvForm] = useState({ scheduledAt: '', interviewer: '', mode: 'in-person', title: '', meetingLink: '' })
  const [ivSaving, setIvSaving] = useState(false)
  const [users, setUsers] = useState([])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [cr, fur, ivr] = await Promise.all([
        hrApi.getCandidate(id),
        hrApi.listFollowups(id),
        hrApi.listInterviews(id),
      ])
      setCandidate(cr.data.data.candidate)
      setFollowups(fur.data.data.followups || [])
      setInterviews(ivr.data.data.interviews || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => {
    loadAll()
    import('../../../api/axios').then(({ default: api }) =>
      api.get('/users', { params: { limit: 200 } }).then(r => setUsers(r.data.data.users || []))
    )
  }, [loadAll])

  const changeStatus = async (status) => {
    setSaving(true)
    try {
      const r = await hrApi.updateStatus(id, { status })
      setCandidate(r.data.data.candidate)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const addFollowup = async (e) => {
    e.preventDefault()
    setFupSaving(true)
    try {
      await hrApi.createFollowup(id, fupForm)
      setFupForm({ scheduledAt: '', notes: '' })
      const r = await hrApi.listFollowups(id)
      setFollowups(r.data.data.followups || [])
    } catch (e) { console.error(e) }
    finally { setFupSaving(false) }
  }

  const completeFollowup = async (fupId) => {
    await hrApi.updateFollowup(id, fupId, { status: 'completed' })
    const r = await hrApi.listFollowups(id)
    setFollowups(r.data.data.followups || [])
  }

  const addInterview = async (e) => {
    e.preventDefault()
    setIvSaving(true)
    try {
      await hrApi.createInterview(id, ivForm)
      setIvForm({ scheduledAt: '', interviewer: '', mode: 'in-person', title: '', meetingLink: '' })
      const r = await hrApi.listInterviews(id)
      setInterviews(r.data.data.interviews || [])
    } catch (e) { console.error(e) }
    finally { setIvSaving(false) }
  }

  const completeInterview = async (ivId, feedback, rating, recommendation) => {
    await hrApi.updateInterview(id, ivId, { status: 'completed', feedback, rating: +rating, recommendation })
    const r = await hrApi.listInterviews(id)
    setInterviews(r.data.data.interviews || [])
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>
  if (!candidate) return <div className="text-red-400 text-center py-8">Candidate not found</div>

  const fullName = [candidate.firstName, candidate.middleName, candidate.lastName].filter(Boolean).join(' ')

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <button onClick={() => navigate('/hr/candidates')} className="text-xs text-gray-500 hover:text-gray-300">
        ← Back to Candidates
      </button>

      {/* Header card */}
      <div className="bg-[#0A1628] border border-blue-900 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#1E6FD9] flex items-center justify-center text-white text-xl font-bold shrink-0">
            {candidate.firstName?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-white">{fullName}</h1>
              {candidate.previouslyApplied && (
                <span className="text-xs bg-orange-900/40 text-orange-300 border border-orange-800 px-2 py-0.5 rounded-full">
                  Previously Applied
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm mt-0.5">{candidate.phone} · {candidate.email || 'No email'}</p>
            <p className="text-gray-500 text-xs mt-1">{candidate.appliedProfile} · {candidate.appliedFor} · {candidate.leadSource}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              value={candidate.status}
              onChange={e => changeStatus(e.target.value)}
              disabled={saving}
              className={`text-xs px-2 py-1.5 rounded-lg border border-transparent cursor-pointer ${STATUS_COLORS[candidate.status]}`}
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={() => navigate(`/hr/candidates/${id}/edit`)}
              className="text-xs px-3 py-1.5 bg-[#1A3A6B] hover:bg-blue-800 text-white rounded-lg">
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-blue-900">
        {['profile', 'skills', 'followups', 'interviews'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`text-sm px-5 py-2.5 border-b-2 capitalize transition-colors ${
              activeTab === tab ? 'border-[#1E6FD9] text-white' : 'border-transparent text-gray-400 hover:text-white'
            }`}>
            {tab === 'followups'  ? `Follow-ups (${followups.length})` :
             tab === 'interviews' ? `Interviews (${interviews.length})` : tab}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <InfoCard title="Personal">
            <InfoRow label="DOB"          value={candidate.dob ? new Date(candidate.dob).toLocaleDateString('en-IN') : '—'} />
            <InfoRow label="Gender"       value={candidate.gender} />
            <InfoRow label="Marital"      value={candidate.maritalStatus} />
            <InfoRow label="Languages"    value={candidate.languagesKnown?.join(', ') || '—'} />
            <InfoRow label="Address"      value={candidate.address || '—'} />
          </InfoCard>
          <InfoCard title="Experience">
            <InfoRow label="Total Exp"    value={`${candidate.totalExperience} years`} />
            <InfoRow label="Last Company" value={candidate.previousCompany || '—'} />
            <InfoRow label="Last Profile" value={candidate.previousProfile || '—'} />
            <InfoRow label="Last Salary"  value={candidate.lastSalary ? `₹${candidate.lastSalary.toLocaleString('en-IN')}` : '—'} />
            <InfoRow label="Exp Salary"   value={candidate.expectedSalary ? `₹${candidate.expectedSalary.toLocaleString('en-IN')}` : '—'} />
            <InfoRow label="Education"    value={candidate.education || '—'} />
          </InfoCard>
          <InfoCard title="Application">
            <InfoRow label="Applied"      value={new Date(candidate.appliedDate || candidate.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
            <InfoRow label="Source"       value={candidate.leadSource} />
            {candidate.referenceName && <InfoRow label="Reference" value={candidate.referenceName} />}
            <InfoRow label="Priority"     value={candidate.priority} />
            <InfoRow label="Calling"      value={candidate.callingStatus} />
          </InfoCard>
          {candidate.notes && (
            <InfoCard title="Notes">
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{candidate.notes}</p>
            </InfoCard>
          )}
          {(candidate.cvLink || candidate.portfolioLink) && (
            <InfoCard title="Files">
              {candidate.cvLink && (
                <a href={candidate.cvLink} target="_blank" rel="noreferrer"
                  className="text-sm text-[#1E6FD9] hover:text-[#00C6FF] block">View CV / Resume →</a>
              )}
              {candidate.portfolioLink && (
                <a href={candidate.portfolioLink} target="_blank" rel="noreferrer"
                  className="text-sm text-[#1E6FD9] hover:text-[#00C6FF] block mt-1">View Portfolio →</a>
              )}
            </InfoCard>
          )}
        </div>
      )}

      {/* Skills tab */}
      {activeTab === 'skills' && (
        <div className="bg-[#0A1628] border border-blue-900 rounded-2xl p-5">
          <h2 className="text-base font-semibold text-white mb-4">
            Skills — {candidate.appliedProfile}
            <span className="text-sm font-normal text-gray-500 ml-2">({candidate.skills?.length || 0} listed)</span>
          </h2>
          {!candidate.skills?.length ? (
            <p className="text-gray-500 text-sm">No skills listed yet.</p>
          ) : (
            (() => {
              const grouped = {}
              candidate.skills.forEach(s => {
                const cat = s.category || 'General'
                if (!grouped[cat]) grouped[cat] = []
                grouped[cat].push(s)
              })
              return Object.entries(grouped).map(([cat, skills]) => (
                <div key={cat} className="mb-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{cat}</p>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s, i) => (
                      <span key={i} className={`text-xs px-2.5 py-1 rounded-full ${PROFICIENCY_COLORS[s.proficiency]}`}>
                        {s.skill}
                        <span className="ml-1 opacity-70">· {s.proficiency}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))
            })()
          )}
        </div>
      )}

      {/* Follow-ups tab */}
      {activeTab === 'followups' && (
        <div className="space-y-4">
          {/* Add followup form */}
          <div className="bg-[#0A1628] border border-blue-900 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Schedule Follow-up</h3>
            <form onSubmit={addFollowup} className="flex gap-3 flex-wrap">
              <input type="datetime-local" value={fupForm.scheduledAt}
                onChange={e => setFupForm(f => ({ ...f, scheduledAt: e.target.value }))} required
                className="bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm" />
              <input value={fupForm.notes} onChange={e => setFupForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Notes (optional)"
                className="flex-1 bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500" />
              <button type="submit" disabled={fupSaving || !fupForm.scheduledAt}
                className="px-4 py-2 bg-[#1E6FD9] text-white rounded-lg text-sm disabled:opacity-40">
                {fupSaving ? '...' : 'Schedule'}
              </button>
            </form>
          </div>

          {followups.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No follow-ups scheduled.</p>
          ) : (
            followups.map(f => (
              <div key={f._id} className="bg-[#0A1628] border border-blue-900 rounded-xl p-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-white font-medium">
                    {new Date(f.scheduledAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {f.notes && <p className="text-xs text-gray-400 mt-1">{f.notes}</p>}
                  {f.outcome && <p className="text-xs text-green-400 mt-1">Outcome: {f.outcome}</p>}
                  <p className="text-xs text-gray-600 mt-1">by {f.createdBy?.name || 'You'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    f.status === 'completed' ? 'bg-green-900/40 text-green-300' :
                    f.status === 'missed'    ? 'bg-red-900/40 text-red-300' :
                    'bg-blue-900/40 text-blue-300'
                  }`}>{f.status}</span>
                  {f.status === 'pending' && (
                    <button onClick={() => completeFollowup(f._id)}
                      className="text-xs px-2 py-1 bg-green-800 hover:bg-green-700 text-white rounded">
                      Done
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Interviews tab */}
      {activeTab === 'interviews' && (
        <div className="space-y-4">
          {/* Schedule interview */}
          <div className="bg-[#0A1628] border border-blue-900 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">
              Schedule Interview <span className="text-gray-500 font-normal">(Round {interviews.length + 1})</span>
            </h3>
            <form onSubmit={addInterview} className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <input value={ivForm.title} onChange={e => setIvForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Round title (e.g. HR Round)"
                className="col-span-2 md:col-span-1 bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500" />
              <input type="datetime-local" value={ivForm.scheduledAt}
                onChange={e => setIvForm(f => ({ ...f, scheduledAt: e.target.value }))} required
                className="bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm" />
              <select value={ivForm.interviewer} onChange={e => setIvForm(f => ({ ...f, interviewer: e.target.value }))} required
                className="bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm">
                <option value="">Select Interviewer</option>
                {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
              </select>
              <select value={ivForm.mode} onChange={e => setIvForm(f => ({ ...f, mode: e.target.value }))}
                className="bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm">
                {['in-person', 'video', 'phone'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              {ivForm.mode === 'video' && (
                <input value={ivForm.meetingLink} onChange={e => setIvForm(f => ({ ...f, meetingLink: e.target.value }))}
                  placeholder="Meeting link"
                  className="bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500" />
              )}
              <button type="submit" disabled={ivSaving || !ivForm.scheduledAt || !ivForm.interviewer}
                className="px-4 py-2 bg-[#1E6FD9] text-white rounded-lg text-sm disabled:opacity-40">
                {ivSaving ? '...' : 'Schedule'}
              </button>
            </form>
          </div>

          {interviews.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No interviews scheduled.</p>
          ) : (
            interviews.map(iv => (
              <InterviewCard key={iv._id} interview={iv} onComplete={completeInterview} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function InfoCard({ title, children }) {
  return (
    <div className="bg-[#0A1628] border border-blue-900 rounded-2xl p-5">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-xs text-gray-300 text-right">{value}</span>
    </div>
  )
}

function InterviewCard({ interview, onComplete }) {
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedback, setFeedback]         = useState('')
  const [rating, setRating]             = useState('3')
  const [rec, setRec]                   = useState('proceed')
  const [saving, setSaving]             = useState(false)

  const submit = async () => {
    setSaving(true)
    await onComplete(interview._id, feedback, rating, rec)
    setSaving(false)
    setShowFeedback(false)
  }

  const statusBg = interview.status === 'completed' ? 'border-green-900/50' :
                   interview.status === 'no-show'   ? 'border-red-900/50' : 'border-blue-900'

  return (
    <div className={`bg-[#0A1628] border ${statusBg} rounded-2xl p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs bg-[#1A3A6B] text-gray-300 px-2 py-0.5 rounded">Round {interview.round}</span>
            {interview.title && <span className="text-sm font-medium text-white">{interview.title}</span>}
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              interview.status === 'completed' ? 'bg-green-900/40 text-green-300' :
              interview.status === 'no-show'   ? 'bg-red-900/40 text-red-300' :
              'bg-blue-900/40 text-blue-300'
            }`}>{interview.status}</span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {new Date(interview.scheduledAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            {' · '}{interview.mode}
            {' · '}{interview.interviewer?.name || '—'}
          </p>
          {interview.feedback && (
            <p className="text-sm text-gray-300 mt-2 italic">"{interview.feedback}"</p>
          )}
          {interview.rating && (
            <p className="text-xs text-yellow-400 mt-1">
              Rating: {interview.rating}/5
              {interview.recommendation && (
                <span className={`ml-2 ${RECOMMENDATION_COLORS[interview.recommendation]}`}>
                  → {interview.recommendation.replace('_', ' ')}
                </span>
              )}
            </p>
          )}
        </div>
        {interview.status === 'scheduled' && (
          <button onClick={() => setShowFeedback(!showFeedback)}
            className="text-xs px-3 py-1.5 bg-green-800 hover:bg-green-700 text-white rounded-lg shrink-0">
            Add Feedback
          </button>
        )}
      </div>

      {showFeedback && (
        <div className="mt-4 pt-4 border-t border-blue-900 space-y-3">
          <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={3}
            placeholder="Interview feedback..."
            className="w-full bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 resize-none" />
          <div className="flex gap-3 flex-wrap">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Rating (1-5)</label>
              <select value={rating} onChange={e => setRating(e.target.value)}
                className="bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm">
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Recommendation</label>
              <select value={rec} onChange={e => setRec(e.target.value)}
                className="bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm">
                <option value="proceed">Proceed (Select)</option>
                <option value="next_round">Next Round</option>
                <option value="hold">Hold</option>
                <option value="reject">Reject</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button onClick={submit} disabled={saving}
                className="px-4 py-2 bg-[#1E6FD9] text-white rounded-lg text-sm disabled:opacity-40">
                {saving ? 'Saving...' : 'Submit Feedback'}
              </button>
              <button onClick={() => setShowFeedback(false)} className="text-sm text-gray-400 hover:text-white px-2 py-2">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
