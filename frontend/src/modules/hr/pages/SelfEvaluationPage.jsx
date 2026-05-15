import { useState, useEffect } from 'react'
import { hrApi } from '../../../api/hr.api'
import { ClipboardList, Star } from 'lucide-react'

const inp = "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none w-full"

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`transition-colors ${n <= value ? 'text-yellow-400' : 'text-gray-600'} hover:text-yellow-300`}>
          <Star size={18} fill={n <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  )
}

export default function SelfEvaluationPage() {
  const [cycles, setCycles] = useState([])
  const [selectedCycle, setSelectedCycle] = useState('')
  const [goals, setGoals] = useState([])
  const [existing, setExisting] = useState(null)
  const [form, setForm] = useState({ strengths: '', improvements: '', trainingNeeds: '' })
  const [goalRatings, setGoalRatings] = useState({}) // goalId → { selfRating, comments }
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    hrApi.listCycles({ status: 'active' })
      .then(r => {
        const cs = r.data.data.cycles
        setCycles(cs)
        if (cs.length) setSelectedCycle(cs[0]._id)
      }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedCycle) return
    // Load existing eval + goals for self (need to get own employeeId first via profile)
    Promise.all([
      hrApi.getMySelfEval(selectedCycle),
      hrApi.getMyProfile(),
    ]).then(([er, pr]) => {
      const emp = pr.data.data.employee
      if (emp) {
        return hrApi.listGoals(emp._id, { cycleId: selectedCycle })
          .then(gr => {
            setGoals(gr.data.data.goals)
          })
      }
    }).catch(() => {})

    hrApi.getMySelfEval(selectedCycle).then(r => {
      const ev = r.data.data.evaluation
      if (ev) {
        setExisting(ev)
        setForm({ strengths: ev.strengths || '', improvements: ev.improvements || '', trainingNeeds: ev.trainingNeeds || '' })
        const ratings = {}
        ;(ev.goalRatings || []).forEach(gr => {
          ratings[gr.goalId?._id || gr.goalId] = { selfRating: gr.selfRating, comments: gr.comments || '' }
        })
        setGoalRatings(ratings)
        setSubmitted(!!ev.submittedAt)
      }
    }).catch(() => {})
  }, [selectedCycle])

  const setRating = (goalId, selfRating) => setGoalRatings(r => ({ ...r, [goalId]: { ...r[goalId], selfRating } }))
  const setComment = (goalId, comments) => setGoalRatings(r => ({ ...r, [goalId]: { ...r[goalId], comments } }))

  const save = async (submit = false) => {
    setSaving(true); setMsg('')
    try {
      const goalRatingsList = goals.map(g => ({
        goalId: g._id,
        selfRating: goalRatings[g._id]?.selfRating || 3,
        comments:   goalRatings[g._id]?.comments || '',
      }))
      await hrApi.saveSelfEval(selectedCycle, { ...form, goalRatings: goalRatingsList, submit })
      setMsg(submit ? 'Evaluation submitted!' : 'Draft saved.')
      if (submit) setSubmitted(true)
    } catch (e) {
      setMsg(e.response?.data?.error?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  return (
    <div className="p-6 space-y-6" style={{ color: '#fff' }}>
      <div className="flex items-center gap-3">
        <ClipboardList size={22} style={{ color: '#1E6FD9' }} />
        <h1 className="text-xl font-bold">Self Evaluation</h1>
      </div>

      {/* Cycle selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400">Cycle:</label>
        <select className={inp + ' w-64'} value={selectedCycle} onChange={e => setSelectedCycle(e.target.value)}>
          <option value="">Select cycle…</option>
          {cycles.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        {submitted && <span className="text-xs text-green-400 font-medium">✓ Submitted</span>}
      </div>

      {selectedCycle && !submitted && (
        <div className="space-y-5">
          {/* Goal ratings */}
          {goals.length > 0 && (
            <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="font-semibold text-white text-sm">Goal Ratings</p>
              {goals.map(g => (
                <div key={g._id} className="space-y-2 border-b pb-4 last:border-0 last:pb-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white">{g.title}</p>
                    <StarRating value={goalRatings[g._id]?.selfRating || 0} onChange={v => setRating(g._id, v)} />
                  </div>
                  {g.targetValue && <p className="text-xs text-gray-500">Target: {g.targetValue}</p>}
                  <input className={inp + ' text-xs'} placeholder="Comments on this goal…"
                    value={goalRatings[g._id]?.comments || ''}
                    onChange={e => setComment(g._id, e.target.value)} />
                </div>
              ))}
            </div>
          )}

          {/* Written sections */}
          <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="font-semibold text-white text-sm">Reflection</p>
            {[
              { key: 'strengths', label: 'Key Strengths', placeholder: 'What did you do well this cycle?' },
              { key: 'improvements', label: 'Areas for Improvement', placeholder: 'What could you have done better?' },
              { key: 'trainingNeeds', label: 'Training Needs', placeholder: 'What skills or training would help you grow?' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">{label}</label>
                <textarea
                  className={inp + ' resize-none'}
                  rows={3}
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>

          {msg && <p className={`text-sm ${msg.includes('failed') || msg.includes('Failed') ? 'text-red-400' : 'text-green-400'}`}>{msg}</p>}

          <div className="flex gap-3">
            <button onClick={() => save(false)} disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 text-gray-300 hover:text-white disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            <button onClick={() => save(true)} disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: '#10B981', color: '#fff' }}>
              {saving ? 'Submitting…' : 'Submit Evaluation'}
            </button>
          </div>
        </div>
      )}

      {submitted && (
        <div className="rounded-xl p-8 text-center" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(16,185,129,0.3)' }}>
          <p className="text-green-400 font-semibold text-lg mb-2">Evaluation Submitted</p>
          <p className="text-gray-400 text-sm">Your self-evaluation has been submitted and is awaiting manager review.</p>
        </div>
      )}
    </div>
  )
}
