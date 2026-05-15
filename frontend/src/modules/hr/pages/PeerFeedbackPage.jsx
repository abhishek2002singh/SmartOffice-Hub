import { useState, useEffect } from 'react'
import { hrApi } from '../../../api/hr.api'
import { Users, Star } from 'lucide-react'

const inp = "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none w-full"

const DIMENSIONS = ['teamwork', 'communication', 'reliability', 'innovation', 'leadership']

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`transition-colors ${n <= value ? 'text-yellow-400' : 'text-gray-600'} hover:text-yellow-300`}>
          <Star size={16} fill={n <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  )
}

export default function PeerFeedbackPage() {
  const [cycles, setCycles] = useState([])
  const [selectedCycle, setSelectedCycle] = useState('')
  const [employees, setEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [ratings, setRatings] = useState({ teamwork: 0, communication: 0, reliability: 0, innovation: 0, leadership: 0 })
  const [comments, setComments] = useState('')
  const [anonymous, setAnonymous] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  useEffect(() => {
    Promise.all([hrApi.listCycles({ status: 'active' }), hrApi.listEmployees({ limit: 200 })])
      .then(([cr, er]) => {
        setCycles(cr.data.data.cycles)
        setEmployees(er.data.data.employees)
        if (cr.data.data.cycles.length) setSelectedCycle(cr.data.data.cycles[0]._id)
      }).catch(() => {})
  }, [])

  const submit = async () => {
    if (!selectedEmployee || !selectedCycle) { setMsg({ type: 'error', text: 'Select employee and cycle' }); return }
    const allRated = DIMENSIONS.every(d => ratings[d] > 0)
    if (!allRated) { setMsg({ type: 'error', text: 'Please rate all dimensions' }); return }
    setSaving(true); setMsg({ type: '', text: '' })
    try {
      await hrApi.submitPeerFeedback({ evaluateeId: selectedEmployee, cycleId: selectedCycle, ratings, comments, anonymous })
      setMsg({ type: 'success', text: 'Feedback submitted successfully!' })
      setRatings({ teamwork: 0, communication: 0, reliability: 0, innovation: 0, leadership: 0 })
      setComments('')
      setSelectedEmployee('')
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error?.message || 'Failed to submit' })
    } finally { setSaving(false) }
  }

  return (
    <div className="p-6 space-y-6" style={{ color: '#fff' }}>
      <div className="flex items-center gap-3">
        <Users size={22} style={{ color: '#1E6FD9' }} />
        <h1 className="text-xl font-bold">Peer Feedback (360°)</h1>
      </div>

      <div className="rounded-xl p-6 space-y-5 max-w-2xl" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Performance Cycle</label>
            <select className={inp} value={selectedCycle} onChange={e => setSelectedCycle(e.target.value)}>
              <option value="">Select cycle…</option>
              {cycles.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Give Feedback To</label>
            <select className={inp} value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}>
              <option value="">Select colleague…</option>
              {employees.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-white">Dimension Ratings</p>
          {DIMENSIONS.map(dim => (
            <div key={dim} className="flex items-center justify-between">
              <span className="text-sm text-gray-300 capitalize w-36">{dim}</span>
              <StarRating value={ratings[dim]} onChange={v => setRatings(r => ({ ...r, [dim]: v }))} />
              <span className="text-xs text-gray-500 w-8 text-right">{ratings[dim] || '—'}</span>
            </div>
          ))}
        </div>

        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Additional Comments</label>
          <textarea className={inp + ' resize-none'} rows={3}
            placeholder="Share specific observations…"
            value={comments} onChange={e => setComments(e.target.value)} />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} className="accent-blue-500" />
          Submit anonymously
          <span className="text-xs text-gray-500">(your name will be hidden from the recipient)</span>
        </label>

        {msg.text && <p className={`text-sm ${msg.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{msg.text}</p>}

        <button onClick={submit} disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
          {saving ? 'Submitting…' : 'Submit Feedback'}
        </button>
      </div>
    </div>
  )
}
