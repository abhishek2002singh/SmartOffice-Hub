import { useState, useEffect } from 'react'
import { hrApi } from '../../../api/hr.api'
import { useSelector } from 'react-redux'
import { Users2, Plus, Check, Calendar } from 'lucide-react'
import dayjs from 'dayjs'

const inp = "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none w-full"

const STATUS_COLOR = {
  scheduled:  'bg-blue-500/20 text-blue-300',
  completed:  'bg-green-500/20 text-green-300',
  cancelled:  'bg-red-500/20 text-red-300',
}

function CreateForm({ employees, onSave, onCancel }) {
  const [form, setForm] = useState({
    employeeId: '', scheduledAt: '', agenda: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.employeeId || !form.scheduledAt) return
    setSaving(true)
    try {
      await onSave(form)
    } finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl p-5 space-y-4 mb-4" style={{ backgroundColor: 'rgba(30,111,217,0.08)', border: '1px solid rgba(30,111,217,0.3)' }}>
      <p className="font-semibold text-white">Schedule 1-on-1</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Team Member</label>
          <select className={inp} value={form.employeeId} onChange={e => set('employeeId', e.target.value)}>
            <option value="">Select employee…</option>
            {employees.map(e => (
              <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Scheduled At</label>
          <input type="datetime-local" className={inp} value={form.scheduledAt} onChange={e => set('scheduledAt', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Agenda</label>
          <input className={inp} placeholder="What will you discuss?" value={form.agenda} onChange={e => set('agenda', e.target.value)} />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={submit} disabled={saving || !form.employeeId || !form.scheduledAt}
          className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
          {saving ? 'Scheduling…' : 'Schedule'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-gray-300">Cancel</button>
      </div>
    </div>
  )
}

function ActionItemRow({ item, onToggle }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <button onClick={onToggle}
        className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${item.completed ? 'bg-green-500 border-green-500' : 'border-white/20 bg-white/5'}`}>
        {item.completed && <Check size={10} className="text-white" />}
      </button>
      <span className={`text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-300'}`}>{item.text}</span>
      {item.dueDate && (
        <span className="text-xs text-gray-500 ml-auto flex-shrink-0">{dayjs(item.dueDate).format('DD MMM')}</span>
      )}
    </div>
  )
}

function MeetingCard({ meeting, onUpdate }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing]   = useState(false)
  const [notes, setNotes]       = useState(meeting.notes || '')
  const [newAction, setNewAction] = useState('')
  const [newDue, setNewDue]       = useState('')
  const [saving, setSaving]       = useState(false)

  const save = async (updates) => {
    setSaving(true)
    try {
      const r = await hrApi.updateOneOnOne(meeting._id, updates)
      onUpdate(r.data.data.meeting)
      setEditing(false)
    } finally { setSaving(false) }
  }

  const addAction = async () => {
    if (!newAction.trim()) return
    const items = [...(meeting.actionItems || []), { text: newAction.trim(), dueDate: newDue || undefined, completed: false }]
    await save({ actionItems: items })
    setNewAction(''); setNewDue('')
  }

  const toggleAction = async (idx) => {
    const items = meeting.actionItems.map((item, i) =>
      i === idx ? { ...item, completed: !item.completed, completedAt: !item.completed ? new Date() : undefined } : item
    )
    await save({ actionItems: items })
  }

  const markCompleted = () => save({ status: 'completed', conductedAt: new Date() })
  const markCancelled = () => save({ status: 'cancelled' })

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="p-4 flex items-start justify-between cursor-pointer" onClick={() => setExpanded(x => !x)}>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLOR[meeting.status]}`}>{meeting.status}</span>
            <span className="text-sm font-medium text-white">
              {meeting.employeeId?.firstName} {meeting.employeeId?.lastName}
            </span>
            <span className="text-xs text-gray-500">with</span>
            <span className="text-xs text-gray-400">{meeting.managerId?.firstName} {meeting.managerId?.lastName}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Calendar size={11} />{dayjs(meeting.scheduledAt).format('DD MMM YYYY, HH:mm')}</span>
            {meeting.agenda && <span>· {meeting.agenda}</span>}
            {(meeting.actionItems?.length > 0) && (
              <span className="text-blue-400">{meeting.actionItems.filter(a => a.completed).length}/{meeting.actionItems.length} actions done</span>
            )}
          </div>
        </div>
        <span className="text-gray-600 text-xs">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          {/* Notes */}
          <div className="pt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Meeting Notes</p>
              {meeting.status !== 'completed' && !editing && (
                <button onClick={() => setEditing(true)} className="text-xs text-blue-400 hover:text-blue-300">Edit</button>
              )}
            </div>
            {editing ? (
              <div className="space-y-2">
                <textarea className={inp + ' resize-none'} rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Meeting notes…" />
                <div className="flex gap-2">
                  <button onClick={() => save({ notes })} disabled={saving}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                    style={{ backgroundColor: '#10B981', color: '#fff' }}>
                    {saving ? 'Saving…' : 'Save Notes'}
                  </button>
                  <button onClick={() => { setEditing(false); setNotes(meeting.notes || '') }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-gray-300">Cancel</button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{meeting.notes || <span className="text-gray-600 italic">No notes yet</span>}</p>
            )}
          </div>

          {/* Action Items */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Action Items</p>
            {(meeting.actionItems || []).map((item, idx) => (
              <ActionItemRow key={idx} item={item} onToggle={() => toggleAction(idx)} />
            ))}
            {meeting.status !== 'completed' && (
              <div className="flex gap-2 mt-2">
                <input className={inp + ' text-xs'} placeholder="Add action item…" value={newAction} onChange={e => setNewAction(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addAction()} />
                <input type="date" className={`${inp} w-40 text-xs`} value={newDue} onChange={e => setNewDue(e.target.value)} />
                <button onClick={addAction} className="px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0" style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
                  <Plus size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Status actions */}
          {meeting.status === 'scheduled' && (
            <div className="flex gap-2 pt-1">
              <button onClick={markCompleted} disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                style={{ backgroundColor: '#10B981', color: '#fff' }}>
                Mark Completed
              </button>
              <button onClick={markCancelled} disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-300">
                Cancel Meeting
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function OneOnOnePage() {
  const { user } = useSelector(s => s.auth)
  const isManager = ['ADMIN', 'SUPERADMIN', 'DEPT_HEAD', 'SUBADMIN'].includes(user?.role)

  const [meetings, setMeetings]   = useState([])
  const [employees, setEmployees] = useState([])
  const [adding, setAdding]       = useState(false)
  const [filter, setFilter]       = useState('all')
  const [loading, setLoading]     = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [mr, er] = await Promise.all([
        hrApi.listOneOnOnes({ status: filter !== 'all' ? filter : undefined }),
        isManager ? hrApi.listEmployees({ limit: 200 }) : Promise.resolve({ data: { data: { employees: [] } } }),
      ])
      setMeetings(mr.data.data.meetings)
      if (isManager) setEmployees(er.data.data.employees)
    } catch (_) {}
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  const handleCreate = async (form) => {
    try {
      await hrApi.createOneOnOne(form)
      setAdding(false)
      load()
    } catch (_) {}
  }

  const handleUpdate = (updated) => {
    setMeetings(m => m.map(x => x._id === updated._id ? updated : x))
  }

  const upcoming = meetings.filter(m => m.status === 'scheduled').length

  return (
    <div className="p-6 space-y-6" style={{ color: '#fff' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users2 size={22} style={{ color: '#1E6FD9' }} />
          <h1 className="text-xl font-bold">1-on-1 Meetings</h1>
          {upcoming > 0 && (
            <span className="text-xs px-2 py-0.5 rounded font-medium bg-blue-500/20 text-blue-300">{upcoming} upcoming</span>
          )}
        </div>
        {isManager && !adding && (
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
            <Plus size={14} /> Schedule
          </button>
        )}
      </div>

      {adding && <CreateForm employees={employees} onSave={handleCreate} onCancel={() => setAdding(false)} />}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['all', 'scheduled', 'completed', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filter === s ? 'text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}
            style={filter === s ? { backgroundColor: '#1E6FD9' } : {}}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500 text-sm">Loading…</div>
      ) : meetings.length === 0 ? (
        <div className="rounded-xl p-10 text-center text-gray-400" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
          No meetings found
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map(m => (
            <MeetingCard key={m._id} meeting={m} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  )
}
