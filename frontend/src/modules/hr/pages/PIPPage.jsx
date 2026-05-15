import { useState, useEffect } from 'react'
import { hrApi } from '../../../api/hr.api'
import { useSelector } from 'react-redux'
import { AlertTriangle, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import dayjs from 'dayjs'

const inp = "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none w-full"

const STATUS_COLOR = {
  active:    'bg-orange-500/20 text-orange-300',
  passed:    'bg-green-500/20 text-green-300',
  failed:    'bg-red-500/20 text-red-300',
  withdrawn: 'bg-gray-500/20 text-gray-300',
}

const PROGRESS_LABEL = {
  on_track:         { label: 'On Track',         cls: 'bg-green-500/20 text-green-300' },
  needs_improvement:{ label: 'Needs Improvement', cls: 'bg-yellow-500/20 text-yellow-300' },
  not_meeting:      { label: 'Not Meeting',       cls: 'bg-red-500/20 text-red-300' },
}

function CreatePIPForm({ employees, onSave, onCancel }) {
  const [form, setForm] = useState({
    employeeId: '', startDate: '', endDate: '', reason: '',
    expectations: [''],
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const setExpectation = (idx, val) => {
    const arr = [...form.expectations]
    arr[idx] = val
    set('expectations', arr)
  }
  const addExpectation = () => set('expectations', [...form.expectations, ''])
  const removeExpectation = (idx) => set('expectations', form.expectations.filter((_, i) => i !== idx))

  const submit = async () => {
    if (!form.employeeId || !form.startDate || !form.endDate || !form.reason) return
    setSaving(true)
    try {
      await onSave({
        ...form,
        expectations: form.expectations.filter(e => e.trim()),
      })
    } finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl p-5 space-y-4 mb-4" style={{ backgroundColor: 'rgba(255,107,0,0.06)', border: '1px solid rgba(255,107,0,0.3)' }}>
      <p className="font-semibold text-white">Create Performance Improvement Plan</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Employee</label>
          <select className={inp} value={form.employeeId} onChange={e => set('employeeId', e.target.value)}>
            <option value="">Select employee…</option>
            {employees.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Start Date</label>
          <input type="date" className={inp} value={form.startDate} onChange={e => set('startDate', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">End Date</label>
          <input type="date" className={inp} value={form.endDate} onChange={e => set('endDate', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Reason</label>
          <textarea className={inp + ' resize-none'} rows={2} value={form.reason} onChange={e => set('reason', e.target.value)}
            placeholder="Why is this PIP being created?" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-400 uppercase tracking-wider">Expectations / Goals</label>
          <button onClick={addExpectation} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
            <Plus size={11} /> Add
          </button>
        </div>
        {form.expectations.map((exp, idx) => (
          <div key={idx} className="flex gap-2 mb-2">
            <input className={inp + ' text-xs'} value={exp} onChange={e => setExpectation(idx, e.target.value)}
              placeholder={`Expectation ${idx + 1}…`} />
            {form.expectations.length > 1 && (
              <button onClick={() => removeExpectation(idx)} className="px-2 text-red-400 hover:text-red-300 text-xs">✕</button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={submit} disabled={saving || !form.employeeId || !form.startDate || !form.endDate || !form.reason}
          className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: '#FF6B00', color: '#fff' }}>
          {saving ? 'Creating…' : 'Create PIP'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-gray-300">Cancel</button>
      </div>
    </div>
  )
}

function AddReviewForm({ pipId, onSave, onCancel }) {
  const [form, setForm] = useState({ notes: '', progressRating: 'on_track' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.notes) return
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <div className="mt-3 p-4 rounded-lg space-y-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="text-xs font-semibold text-white">Add Progress Review</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Progress</label>
          <select className={inp} value={form.progressRating} onChange={e => set('progressRating', e.target.value)}>
            <option value="on_track">On Track</option>
            <option value="needs_improvement">Needs Improvement</option>
            <option value="not_meeting">Not Meeting</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Notes</label>
          <input className={inp} value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Review observations…" />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={submit} disabled={saving || !form.notes}
          className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
          style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
          {saving ? 'Saving…' : 'Save Review'}
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-gray-300">Cancel</button>
      </div>
    </div>
  )
}

function ClosePIPForm({ pipId, onSave, onCancel }) {
  const [form, setForm] = useState({ outcome: 'passed', closingNotes: '' })
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!form.closingNotes) return
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <div className="mt-3 p-4 rounded-lg space-y-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="text-xs font-semibold text-white">Close PIP</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Outcome</label>
          <select className={inp} value={form.outcome} onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))}>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Closing Notes</label>
          <input className={inp} value={form.closingNotes} onChange={e => setForm(f => ({ ...f, closingNotes: e.target.value }))}
            placeholder="Final assessment…" />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={submit} disabled={saving || !form.closingNotes}
          className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
          style={{ backgroundColor: form.outcome === 'passed' ? '#10B981' : '#EF4444', color: '#fff' }}>
          {saving ? 'Closing…' : `Close as ${form.outcome}`}
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-gray-300">Cancel</button>
      </div>
    </div>
  )
}

function PIPCard({ pip, onRefresh }) {
  const [expanded, setExpanded]   = useState(false)
  const [addingReview, setAddingReview] = useState(false)
  const [closingPIP, setClosingPIP]     = useState(false)

  const saveReview = async (data) => {
    try {
      await hrApi.addPIPReview(pip._id, data)
      setAddingReview(false)
      onRefresh()
    } catch (_) {}
  }

  const closePIP = async (data) => {
    try {
      await hrApi.closePIP(pip._id, data)
      setClosingPIP(false)
      onRefresh()
    } catch (_) {}
  }

  const daysLeft = dayjs(pip.endDate).diff(dayjs(), 'day')

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="p-4 flex items-start justify-between cursor-pointer" onClick={() => setExpanded(x => !x)}>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLOR[pip.status]}`}>{pip.status}</span>
            <span className="font-medium text-white text-sm">{pip.employeeId?.firstName} {pip.employeeId?.lastName}</span>
            <span className="text-xs text-gray-500">{pip.employeeId?.employeeCode}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>{dayjs(pip.startDate).format('DD MMM YYYY')} → {dayjs(pip.endDate).format('DD MMM YYYY')}</span>
            {pip.status === 'active' && (
              <span className={daysLeft <= 7 ? 'text-red-400' : daysLeft <= 14 ? 'text-yellow-400' : 'text-gray-400'}>
                {daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}
              </span>
            )}
            <span>{pip.reviews?.length || 0} review(s)</span>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-gray-500 mt-1" /> : <ChevronDown size={16} className="text-gray-500 mt-1" />}
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <div className="pt-3">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Reason</p>
            <p className="text-sm text-gray-300">{pip.reason}</p>
          </div>

          {pip.expectations?.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Expectations</p>
              <ul className="space-y-1">
                {pip.expectations.map((exp, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-orange-400 mt-0.5">▸</span> {exp}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pip.reviews?.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Progress Reviews</p>
              <div className="space-y-2">
                {pip.reviews.map((rev, idx) => {
                  const prog = PROGRESS_LABEL[rev.progressRating]
                  return (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${prog?.cls}`}>{prog?.label}</span>
                      <div>
                        <p className="text-sm text-gray-300">{rev.notes}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{dayjs(rev.reviewedAt).format('DD MMM YYYY')}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {pip.status === 'active' && (
            <>
              {!addingReview && !closingPIP && (
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setAddingReview(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
                    Add Review
                  </button>
                  <button onClick={() => setClosingPIP(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500/20 text-orange-300">
                    Close PIP
                  </button>
                </div>
              )}
              {addingReview && <AddReviewForm pipId={pip._id} onSave={saveReview} onCancel={() => setAddingReview(false)} />}
              {closingPIP && <ClosePIPForm pipId={pip._id} onSave={closePIP} onCancel={() => setClosingPIP(false)} />}
            </>
          )}

          {pip.status !== 'active' && pip.closingNotes && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Closing Notes</p>
              <p className="text-sm text-gray-300">{pip.closingNotes}</p>
              {pip.closedAt && <p className="text-xs text-gray-500 mt-1">Closed {dayjs(pip.closedAt).format('DD MMM YYYY')}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PIPPage() {
  const { user } = useSelector(s => s.auth)
  const isManager = ['ADMIN', 'SUPERADMIN', 'DEPT_HEAD', 'SUBADMIN'].includes(user?.role)

  const [pips, setPIPs]           = useState([])
  const [employees, setEmployees] = useState([])
  const [adding, setAdding]       = useState(false)
  const [filter, setFilter]       = useState('active')
  const [loading, setLoading]     = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [pr, er] = await Promise.all([
        hrApi.listPIPs({ status: filter }),
        isManager ? hrApi.listEmployees({ limit: 200 }) : Promise.resolve({ data: { data: { employees: [] } } }),
      ])
      setPIPs(pr.data.data.pips)
      if (isManager) setEmployees(er.data.data.employees)
    } catch (_) {}
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  const handleCreate = async (form) => {
    try {
      await hrApi.createPIP(form)
      setAdding(false)
      load()
    } catch (e) {
      const msg = e.response?.data?.error?.message || 'Failed to create'
      alert(msg)
    }
  }

  const counts = { active: 0, passed: 0, failed: 0, withdrawn: 0 }

  return (
    <div className="p-6 space-y-6" style={{ color: '#fff' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle size={22} style={{ color: '#FF6B00' }} />
          <h1 className="text-xl font-bold">Performance Improvement Plans</h1>
        </div>
        {isManager && !adding && (
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: '#FF6B00', color: '#fff' }}>
            <Plus size={14} /> Create PIP
          </button>
        )}
      </div>

      {adding && <CreatePIPForm employees={employees} onSave={handleCreate} onCancel={() => setAdding(false)} />}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['active', 'passed', 'failed', 'withdrawn'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filter === s ? 'text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}
            style={filter === s ? { backgroundColor: '#1A3A6B' } : {}}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500 text-sm">Loading…</div>
      ) : pips.length === 0 ? (
        <div className="rounded-xl p-10 text-center text-gray-400" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
          No {filter} PIPs found
        </div>
      ) : (
        <div className="space-y-3">
          {pips.map(pip => (
            <PIPCard key={pip._id} pip={pip} onRefresh={load} />
          ))}
        </div>
      )}
    </div>
  )
}
