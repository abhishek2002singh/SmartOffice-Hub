import { useState } from 'react'
import { devApi } from '../../../api/dev.api'

const STATUS_COLORS = {
  pending:     'bg-gray-700 text-gray-300',
  in_progress: 'bg-yellow-900/30 text-yellow-300',
  completed:   'bg-green-900/30 text-green-300',
  delayed:     'bg-red-900/30 text-red-300',
}

export default function DevMilestonePanel({ projectId, milestones, onRefresh }) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState({ title: '', dueDate: '', description: '' })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const addMilestone = async (e) => {
    e.preventDefault()
    if (!form.title || !form.dueDate) return
    setSaving(true)
    try {
      await devApi.createMilestone(projectId, form)
      setForm({ title: '', dueDate: '', description: '' })
      setShowForm(false)
      onRefresh?.()
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const updateStatus = async (milestone, status) => {
    try {
      await devApi.updateMilestone(projectId, milestone._id, { status })
      onRefresh?.()
    } catch (err) { console.error(err) }
  }

  const deleteMilestone = async (id) => {
    if (!confirm('Delete this milestone?')) return
    try {
      await devApi.deleteMilestone(projectId, id)
      onRefresh?.()
    } catch (err) { console.error(err) }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-white font-semibold">Milestones ({milestones.length})</h3>
        <button onClick={() => setShowForm(s => !s)}
          className="text-sm px-3 py-1.5 bg-[#1E6FD9] hover:bg-blue-600 text-white rounded-lg transition-colors">
          + Add Milestone
        </button>
      </div>

      {showForm && (
        <form onSubmit={addMilestone} className="bg-[#1A3A6B] border border-blue-800 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Milestone title *"
              className="bg-[#0A1628] border border-blue-900 rounded px-3 py-2 text-white text-sm placeholder-gray-500 col-span-2" />
            <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)}
              className="bg-[#0A1628] border border-blue-900 rounded px-3 py-2 text-white text-sm" />
            <input value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Description (optional)"
              className="bg-[#0A1628] border border-blue-900 rounded px-3 py-2 text-white text-sm placeholder-gray-500" />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-400 hover:text-white px-3 py-1.5">Cancel</button>
            <button type="submit" disabled={saving}
              className="text-sm px-4 py-1.5 bg-[#1E6FD9] hover:bg-blue-600 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Saving...' : 'Add'}
            </button>
          </div>
        </form>
      )}

      {/* Milestone timeline (vertical list) */}
      {milestones.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No milestones yet. Add the first one!</p>
      ) : (
        <div className="space-y-0 relative">
          {/* vertical line */}
          <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-blue-900" />
          {milestones.map((m, i) => {
            const isOverdue = m.status !== 'completed' && new Date(m.dueDate) < new Date()
            return (
              <div key={m._id} className="flex gap-4 relative pl-10 pb-6">
                {/* dot */}
                <div className={`absolute left-[11px] top-1.5 w-3 h-3 rounded-full border-2 ${
                  m.status === 'completed' ? 'bg-green-400 border-green-400' :
                  isOverdue ? 'bg-red-400 border-red-400' :
                  m.status === 'in_progress' ? 'bg-yellow-400 border-yellow-400' :
                  'bg-blue-900 border-blue-600'
                }`} />

                <div className="flex-1 bg-[#1A3A6B] border border-blue-900 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-white font-medium">{m.title}</h4>
                      {m.description && <p className="text-xs text-gray-400 mt-0.5">{m.description}</p>}
                    </div>
                    <button onClick={() => deleteMilestone(m._id)} className="text-gray-600 hover:text-red-400 text-xs shrink-0">✕</button>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[m.status]}`}>
                      {m.status?.replace('_', ' ')}
                    </span>
                    <span className={`text-xs ${isOverdue && m.status !== 'completed' ? 'text-red-400' : 'text-gray-400'}`}>
                      Due: {new Date(m.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {isOverdue && m.status !== 'completed' && ' ⚠️ Overdue'}
                    </span>
                    {m.assignedTo && <span className="text-xs text-gray-500">→ {m.assignedTo.name}</span>}
                  </div>
                  <div className="flex gap-2 mt-2">
                    {['pending', 'in_progress', 'completed', 'delayed'].map(s => (
                      <button key={s} onClick={() => updateStatus(m, s)}
                        className={`text-xs px-2 py-0.5 rounded transition-colors ${m.status === s ? 'bg-[#1E6FD9] text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                        {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
