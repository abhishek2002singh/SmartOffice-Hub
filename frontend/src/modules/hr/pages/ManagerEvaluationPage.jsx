import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { hrApi } from '../../../api/hr.api'
import { UserCheck, Star } from 'lucide-react'

const inp = "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none w-full"

function StarRating({ value, onChange, readonly = false }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => !readonly && onChange?.(n)}
          disabled={readonly}
          className={`transition-colors ${n <= value ? 'text-yellow-400' : 'text-gray-600'} ${!readonly ? 'hover:text-yellow-300' : ''}`}>
          <Star size={18} fill={n <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  )
}

const RATING_LABEL = { 1: 'Needs Improvement', 2: 'Below Average', 3: 'Meets Expectations', 4: 'Exceeds Expectations', 5: 'Outstanding' }

export default function ManagerEvaluationPage() {
  const { id: employeeId } = useParams()

  const [cycles, setCycles] = useState([])
  const [selectedCycle, setSelectedCycle] = useState('')
  const [goals, setGoals] = useState([])
  const [selfEval, setSelfEval] = useState(null)
  const [emp, setEmp] = useState(null)
  const [form, setForm] = useState({ overallRating: 3, strengths: '', improvements: '', incrementRecommendation: 0, promotionRecommendation: false })
  const [goalRatings, setGoalRatings] = useState({})
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    Promise.all([hrApi.listCycles(), hrApi.getEmployee(employeeId)])
      .then(([cr, er]) => {
        setCycles(cr.data.data.cycles)
        setEmp(er.data.data.employee)
        const active = cr.data.data.cycles.find(c => c.status === 'active')
        if (active) setSelectedCycle(active._id)
      }).catch(() => {})
  }, [employeeId])

  useEffect(() => {
    if (!selectedCycle) return
    Promise.all([
      hrApi.listGoals(employeeId, { cycleId: selectedCycle }),
      hrApi.getManagerEval(employeeId, selectedCycle),
    ]).then(([gr, mr]) => {
      setGoals(gr.data.data.goals)
      const ev = mr.data.data.evaluation
      if (ev) {
        setForm({
          overallRating:           ev.overallRating || 3,
          strengths:               ev.strengths || '',
          improvements:            ev.improvements || '',
          incrementRecommendation: ev.incrementRecommendation || 0,
          promotionRecommendation: ev.promotionRecommendation || false,
        })
        const ratings = {}
        ;(ev.goalRatings || []).forEach(gr => {
          ratings[gr.goalId?._id || gr.goalId] = { managerRating: gr.managerRating, comments: gr.comments || '' }
        })
        setGoalRatings(ratings)
        setSubmitted(!!ev.submittedAt)
      }
    }).catch(() => {})

    // Load self evaluation for comparison
    // We need the employee's self eval — use a workaround: load from performance view
    hrApi.getPerformanceView(employeeId, selectedCycle)
      .then(r => setSelfEval(r.data.data.selfEval))
      .catch(() => {})
  }, [selectedCycle, employeeId])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setRating = (goalId, managerRating) => setGoalRatings(r => ({ ...r, [goalId]: { ...r[goalId], managerRating } }))
  const setComment = (goalId, comments) => setGoalRatings(r => ({ ...r, [goalId]: { ...r[goalId], comments } }))

  const save = async (submit = false) => {
    setSaving(true); setMsg('')
    try {
      const goalRatingsList = goals.map(g => ({
        goalId:        g._id,
        managerRating: goalRatings[g._id]?.managerRating || 3,
        comments:      goalRatings[g._id]?.comments || '',
      }))
      await hrApi.saveManagerEval(employeeId, selectedCycle, { ...form, cycleId: selectedCycle, goalRatings: goalRatingsList, submit })
      setMsg(submit ? 'Evaluation submitted!' : 'Draft saved.')
      if (submit) setSubmitted(true)
    } catch (e) {
      setMsg(e.response?.data?.error?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  return (
    <div className="p-6 space-y-6" style={{ color: '#fff' }}>
      <div className="flex items-center gap-3">
        <UserCheck size={22} style={{ color: '#1E6FD9' }} />
        <h1 className="text-xl font-bold">Manager Evaluation{emp ? ` — ${emp.firstName} ${emp.lastName}` : ''}</h1>
        {emp && <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(0,198,255,0.1)', color: '#00C6FF' }}>{emp.employeeCode}</span>}
        {submitted && <span className="text-xs text-green-400 font-medium">✓ Submitted</span>}
      </div>

      {/* Cycle selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400">Cycle:</label>
        <select className={inp + ' w-64'} value={selectedCycle} onChange={e => setSelectedCycle(e.target.value)}>
          <option value="">Select cycle…</option>
          {cycles.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>

      {selectedCycle && (
        <div className="space-y-5">
          {/* Goal-wise ratings with self-eval comparison */}
          {goals.length > 0 && (
            <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="font-semibold text-white text-sm">Goal Ratings</p>
              {goals.map(g => {
                const selfGoalRating = selfEval?.goalRatings?.find(r => r.goalId?._id === g._id || r.goalId === g._id)
                return (
                  <div key={g._id} className="space-y-2 border-b pb-4 last:border-0 last:pb-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-white">{g.title}</p>
                        {g.targetValue && <p className="text-xs text-gray-500">Target: {g.targetValue}</p>}
                        {selfGoalRating && (
                          <p className="text-xs text-blue-400 mt-0.5">Employee self-rating: {selfGoalRating.selfRating}/5{selfGoalRating.comments ? ` — "${selfGoalRating.comments}"` : ''}</p>
                        )}
                      </div>
                      <div className="ml-4">
                        <p className="text-xs text-gray-500 mb-1">Your rating</p>
                        {!submitted
                          ? <StarRating value={goalRatings[g._id]?.managerRating || 0} onChange={v => setRating(g._id, v)} />
                          : <StarRating value={goalRatings[g._id]?.managerRating || 0} readonly />}
                      </div>
                    </div>
                    {!submitted && (
                      <input className={inp + ' text-xs'} placeholder="Manager comments on this goal…"
                        value={goalRatings[g._id]?.comments || ''}
                        onChange={e => setComment(g._id, e.target.value)} />
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Overall rating + written feedback */}
          <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="font-semibold text-white text-sm">Overall Assessment</p>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">Overall Rating</label>
              <div className="flex items-center gap-3">
                {!submitted
                  ? <StarRating value={form.overallRating} onChange={v => set('overallRating', v)} />
                  : <StarRating value={form.overallRating} readonly />}
                <span className="text-sm text-yellow-400">{RATING_LABEL[form.overallRating]}</span>
              </div>
            </div>
            {[
              { key: 'strengths', label: 'Strengths Observed', placeholder: 'Key strengths you observed…' },
              { key: 'improvements', label: 'Areas for Growth', placeholder: 'Areas where improvement is needed…' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">{label}</label>
                <textarea className={inp + ' resize-none'} rows={3} placeholder={placeholder}
                  disabled={submitted}
                  value={form[key]} onChange={e => set(key, e.target.value)} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Increment Recommendation (%)</label>
                <input type="number" className={inp} disabled={submitted}
                  value={form.incrementRecommendation} onChange={e => set('incrementRecommendation', +e.target.value)} min={0} max={100} />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input type="checkbox" disabled={submitted}
                    checked={form.promotionRecommendation}
                    onChange={e => set('promotionRecommendation', e.target.checked)}
                    className="accent-blue-500" />
                  Recommend for Promotion
                </label>
              </div>
            </div>
          </div>

          {msg && <p className={`text-sm ${msg.includes('failed') || msg.includes('Failed') ? 'text-red-400' : 'text-green-400'}`}>{msg}</p>}

          {!submitted && (
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
          )}
        </div>
      )}
    </div>
  )
}
