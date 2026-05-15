import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { hrApi } from '../../../api/hr.api'
import { Flag, Plus, Pencil, Trash2, Check } from 'lucide-react'
import { useSelector } from 'react-redux'

const inp = "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none w-full"

const STATUS_COLOR = {
  set:         'bg-gray-500/20 text-gray-300',
  in_progress: 'bg-blue-500/20 text-blue-300',
  achieved:    'bg-green-500/20 text-green-300',
  missed:      'bg-red-500/20 text-red-300',
}

const GOAL_STATUSES = ['set', 'in_progress', 'achieved', 'missed']
const EMPTY_GOAL = { title: '', description: '', kraId: '', targetValue: '', weightagePercent: 0 }

function GoalForm({ kras, initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY_GOAL)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.title) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="rounded-xl p-4 space-y-3 mb-3" style={{ backgroundColor: 'rgba(30,111,217,0.08)', border: '1px solid rgba(30,111,217,0.3)' }}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Goal Title</label>
          <input className={inp} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Close 10 deals per month" />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">KRA (optional)</label>
          <select className={inp} value={form.kraId} onChange={e => set('kraId', e.target.value)}>
            <option value="">None</option>
            {kras.map(k => <option key={k._id} value={k._id}>{k.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Target Value</label>
          <input className={inp} value={form.targetValue} onChange={e => set('targetValue', e.target.value)} placeholder="e.g. 10 deals, 90% uptime" />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Weightage (%)</label>
          <input type="number" className={inp} value={form.weightagePercent} onChange={e => set('weightagePercent', +e.target.value)} min={0} max={100} />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Description</label>
          <input className={inp} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Additional context…" />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={submit} disabled={saving || !form.title}
          className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
          style={{ backgroundColor: '#10B981', color: '#fff' }}>
          {saving ? 'Saving…' : 'Save Goal'}
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-gray-300">Cancel</button>
      </div>
    </div>
  )
}

export default function GoalSettingPage() {
  const { id: employeeId } = useParams()
  const { user } = useSelector(s => s.auth)
  const isManager = ['ADMIN', 'SUPERADMIN', 'DEPT_HEAD'].includes(user?.role)

  const [cycles, setCycles] = useState([])
  const [selectedCycle, setSelectedCycle] = useState('')
  const [goals, setGoals] = useState([])
  const [kras, setKRAs] = useState([])
  const [emp, setEmp] = useState(null)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    Promise.all([hrApi.listCycles(), hrApi.listKRAs(), hrApi.getEmployee(employeeId)])
      .then(([cr, kr, er]) => {
        setCycles(cr.data.data.cycles)
        setKRAs(kr.data.data.kras)
        setEmp(er.data.data.employee)
        const active = cr.data.data.cycles.find(c => c.status === 'active')
        if (active) setSelectedCycle(active._id)
      }).catch(() => {})
  }, [employeeId])

  useEffect(() => {
    if (!selectedCycle) return
    hrApi.listGoals(employeeId, { cycleId: selectedCycle })
      .then(r => setGoals(r.data.data.goals))
      .catch(() => {})
  }, [selectedCycle, employeeId])

  const handleAddGoals = async (form) => {
    try {
      await hrApi.setGoals(employeeId, { cycleId: selectedCycle, goals: [form] })
      setAdding(false)
      const r = await hrApi.listGoals(employeeId, { cycleId: selectedCycle })
      setGoals(r.data.data.goals)
    } catch (_) {}
  }

  const handleUpdateGoal = async (form) => {
    try {
      await hrApi.updateGoal(employeeId, editing._id, form)
      setEditing(null)
      const r = await hrApi.listGoals(employeeId, { cycleId: selectedCycle })
      setGoals(r.data.data.goals)
    } catch (_) {}
  }

  const handleDelete = async (goalId) => {
    if (!confirm('Delete this goal?')) return
    try {
      await hrApi.deleteGoal(employeeId, goalId)
      setGoals(g => g.filter(x => x._id !== goalId))
    } catch (_) {}
  }

  const updateStatus = async (goalId, status) => {
    try {
      await hrApi.updateGoal(employeeId, goalId, { status })
      setGoals(g => g.map(x => x._id === goalId ? { ...x, status } : x))
    } catch (_) {}
  }

  const totalWeight = goals.reduce((s, g) => s + (g.weightagePercent || 0), 0)

  return (
    <div className="p-6 space-y-6" style={{ color: '#fff' }}>
      <div className="flex items-center gap-3">
        <Flag size={22} style={{ color: '#1E6FD9' }} />
        <h1 className="text-xl font-bold">Goals{emp ? ` — ${emp.firstName} ${emp.lastName}` : ''}</h1>
        {emp && <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(0,198,255,0.1)', color: '#00C6FF' }}>{emp.employeeCode}</span>}
      </div>

      {/* Cycle selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400">Cycle:</label>
        <select className={inp + ' w-64'} value={selectedCycle} onChange={e => setSelectedCycle(e.target.value)}>
          <option value="">Select cycle…</option>
          {cycles.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        {totalWeight > 0 && (
          <span className={`text-xs px-2 py-1 rounded font-medium ${totalWeight === 100 ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
            Total Weight: {totalWeight}%
          </span>
        )}
      </div>

      {selectedCycle && (
        <>
          {adding && <GoalForm kras={kras} onSave={handleAddGoals} onCancel={() => setAdding(false)} />}
          {editing && <GoalForm kras={kras} initial={editing} onSave={handleUpdateGoal} onCancel={() => setEditing(null)} />}

          <div className="space-y-3">
            {goals.map(g => (
              <div key={g._id} className="rounded-xl p-4" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-white">{g.title}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLOR[g.status]}`}>{g.status.replace('_', ' ')}</span>
                      {g.setByManager && <span className="text-xs text-orange-400">Manager-set</span>}
                    </div>
                    {g.description && <p className="text-xs text-gray-500 mb-1">{g.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      {g.kraId && <span>KRA: {g.kraId.name}</span>}
                      {g.targetValue && <span>Target: {g.targetValue}</span>}
                      {g.achievedValue && <span className="text-green-400">Achieved: {g.achievedValue}</span>}
                      <span>Weight: {g.weightagePercent}%</span>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center ml-4">
                    <select
                      className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-gray-300 outline-none"
                      value={g.status}
                      onChange={e => updateStatus(g._id, e.target.value)}>
                      {GOAL_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                    <button onClick={() => { setEditing(g); setAdding(false) }} className="p-1 text-gray-400 hover:text-white"><Pencil size={13} /></button>
                    {isManager && <button onClick={() => handleDelete(g._id)} className="p-1 text-gray-400 hover:text-red-400"><Trash2 size={13} /></button>}
                  </div>
                </div>
              </div>
            ))}

            {goals.length === 0 && (
              <div className="rounded-xl p-8 text-center text-gray-400" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
                No goals set for this cycle
              </div>
            )}
          </div>

          {!adding && !editing && (
            <button onClick={() => { setAdding(true); setEditing(null) }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
              <Plus size={14} /> Add Goal
            </button>
          )}
        </>
      )}
    </div>
  )
}
