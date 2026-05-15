import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { hrApi } from '../../../api/hr.api'
import { MessageSquare, Check } from 'lucide-react'
import dayjs from 'dayjs'

const inp = "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none w-full"

const REASONS = [
  { key: 'better_opportunity', label: 'Better Opportunity' },
  { key: 'compensation',       label: 'Compensation / Salary' },
  { key: 'work_life',          label: 'Work-Life Balance' },
  { key: 'manager',            label: 'Management Issues' },
  { key: 'role',               label: 'Role / Growth Concerns' },
  { key: 'relocation',         label: 'Relocation' },
  { key: 'personal',           label: 'Personal Reasons' },
  { key: 'other',              label: 'Other' },
]

export default function ExitInterviewPage() {
  const { id: employeeId } = useParams()

  const [emp, setEmp]                 = useState(null)
  const [existing, setExisting]       = useState(null)
  const [form, setForm] = useState({
    reasons: [], feedback: '', suggestions: '', wouldRecommend: 'yes', eligibleForRehire: true,
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState({ type: '', text: '' })
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    Promise.all([hrApi.getEmployee(employeeId), hrApi.getExitInterview(employeeId)])
      .then(([er, ir]) => {
        setEmp(er.data.data.employee)
        const interview = ir.data.data.interview
        if (interview) {
          setExisting(interview)
          setForm({
            reasons:           interview.reasons || [],
            feedback:          interview.feedback || '',
            suggestions:       interview.suggestions || '',
            wouldRecommend:    interview.wouldRecommend || 'yes',
            eligibleForRehire: interview.eligibleForRehire ?? true,
          })
          setSubmitted(true)
        }
      }).catch(() => {})
  }, [employeeId])

  const toggleReason = (key) => {
    setForm(f => ({
      ...f,
      reasons: f.reasons.includes(key) ? f.reasons.filter(r => r !== key) : [...f.reasons, key],
    }))
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (form.reasons.length === 0) { setMsg({ type: 'error', text: 'Select at least one reason' }); return }
    setSaving(true); setMsg({ type: '', text: '' })
    try {
      const r = await hrApi.saveExitInterview(employeeId, form)
      setExisting(r.data.data.interview)
      setSubmitted(true)
      setMsg({ type: 'success', text: 'Exit interview saved successfully.' })
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error?.message || 'Failed to save' })
    } finally { setSaving(false) }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl" style={{ color: '#fff' }}>
      <div className="flex items-center gap-3">
        <MessageSquare size={22} style={{ color: '#1E6FD9' }} />
        <h1 className="text-xl font-bold">Exit Interview{emp ? ` — ${emp.firstName} ${emp.lastName}` : ''}</h1>
        {submitted && <span className="text-xs text-green-400 font-medium flex items-center gap-1"><Check size={12} /> Saved</span>}
      </div>

      {existing?.conductedAt && (
        <p className="text-xs text-gray-500">Conducted on {dayjs(existing.conductedAt).format('DD MMM YYYY HH:mm')}</p>
      )}

      <div className="rounded-xl p-6 space-y-5" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Reasons */}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-3">Reasons for Leaving (select all that apply)</label>
          <div className="grid grid-cols-2 gap-2">
            {REASONS.map(r => (
              <label key={r.key}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors border ${form.reasons.includes(r.key) ? 'border-blue-500 bg-blue-500/10 text-blue-200' : 'border-white/10 bg-white/5 text-gray-300'}`}>
                <input type="checkbox" className="hidden" checked={form.reasons.includes(r.key)} onChange={() => toggleReason(r.key)} />
                <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${form.reasons.includes(r.key) ? 'border-blue-500 bg-blue-500' : 'border-white/20'}`}>
                  {form.reasons.includes(r.key) && <Check size={10} className="text-white" />}
                </span>
                {r.label}
              </label>
            ))}
          </div>
        </div>

        {/* Feedback */}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Overall Feedback</label>
          <textarea className={inp + ' resize-none'} rows={3}
            placeholder="What did you enjoy? What could be improved?"
            value={form.feedback} onChange={e => set('feedback', e.target.value)} />
        </div>

        {/* Suggestions */}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Suggestions for the Company</label>
          <textarea className={inp + ' resize-none'} rows={2}
            placeholder="Any suggestions to help ANK Digital Media improve?"
            value={form.suggestions} onChange={e => set('suggestions', e.target.value)} />
        </div>

        {/* Would recommend */}
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">Would you recommend ANK Digital Media as a workplace?</label>
          <div className="flex gap-3">
            {[{ val: 'yes', label: 'Yes', color: '#10B981' }, { val: 'maybe', label: 'Maybe', color: '#EAB308' }, { val: 'no', label: 'No', color: '#EF4444' }].map(opt => (
              <button key={opt.val} type="button" onClick={() => set('wouldRecommend', opt.val)}
                className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                style={{
                  border: `1px solid ${form.wouldRecommend === opt.val ? opt.color : 'rgba(255,255,255,0.1)'}`,
                  backgroundColor: form.wouldRecommend === opt.val ? `${opt.color}20` : 'transparent',
                  color: form.wouldRecommend === opt.val ? opt.color : '#9CA3AF',
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Eligible for rehire */}
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input type="checkbox" checked={form.eligibleForRehire} onChange={e => set('eligibleForRehire', e.target.checked)}
            className="accent-blue-500" />
          Eligible for rehire
          <span className="text-xs text-gray-500">(HR assessment)</span>
        </label>

        {msg.text && <p className={`text-sm ${msg.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{msg.text}</p>}

        <button onClick={submit} disabled={saving}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
          style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
          {saving ? 'Saving…' : submitted ? 'Update Interview' : 'Save Exit Interview'}
        </button>
      </div>
    </div>
  )
}
