import { useState, useEffect, useCallback } from 'react'
import { devApi } from '../../../api/dev.api'
import DevTaskDetailModal from './DevTaskDetailModal'

const COLUMNS = [
  { key: 'backlog',      label: 'Backlog',      color: 'border-gray-700' },
  { key: 'todo',        label: 'To Do',         color: 'border-blue-700' },
  { key: 'in_progress', label: 'In Progress',   color: 'border-yellow-600' },
  { key: 'code_review', label: 'Code Review',   color: 'border-purple-600' },
  { key: 'testing',     label: 'Testing',       color: 'border-cyan-600' },
  { key: 'done',        label: 'Done',          color: 'border-green-600' },
  { key: 'blocked',     label: 'Blocked',       color: 'border-red-600' },
]

const PRIORITY_DOTS = { critical: 'bg-red-500', high: 'bg-orange-400', medium: 'bg-yellow-400', low: 'bg-gray-400' }

export default function DevKanbanBoard({ projectId }) {
  const [tasks, setTasks]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]   = useState(null) // column key
  const [addTitle, setAddTitle] = useState('')
  const [adding, setAdding]     = useState(false)
  const [dragging, setDragging]     = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await devApi.listTasks(projectId, { limit: 200 })
      setTasks(r.data.data.tasks || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = tasks.filter(t => t.status === col.key)
    return acc
  }, {})

  const quickAdd = async (status) => {
    if (!addTitle.trim()) return
    setAdding(true)
    try {
      await devApi.createTask(projectId, { title: addTitle.trim(), status })
      setAddTitle('')
      setShowAdd(null)
      await load()
    } catch (e) { console.error(e) }
    finally { setAdding(false) }
  }

  const onDragStart = (e, task) => {
    setDragging(task)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDrop = async (e, newStatus) => {
    e.preventDefault()
    if (!dragging || dragging.status === newStatus) { setDragging(null); return }
    setTasks(prev => prev.map(t => t._id === dragging._id ? { ...t, status: newStatus } : t))
    try {
      await devApi.updateTask(projectId, dragging._id, { status: newStatus })
    } catch { await load() }
    setDragging(null)
  }

  if (loading) return <div className="text-gray-400 text-center py-8">Loading board...</div>

  return (
    <>
    {selectedTask && (
      <DevTaskDetailModal
        task={selectedTask}
        projectId={projectId}
        onClose={() => setSelectedTask(null)}
        onUpdated={() => { load(); setSelectedTask(null) }}
      />
    )}
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-max">
        {COLUMNS.map(col => {
          const colTasks = tasksByStatus[col.key] || []
          return (
            <div
              key={col.key}
              className={`w-56 bg-[#0A1628] rounded-xl border-t-2 ${col.color} flex flex-col`}
              onDragOver={e => e.preventDefault()}
              onDrop={e => onDrop(e, col.key)}
            >
              <div className="p-3 border-b border-blue-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">{col.label}</span>
                  <span className="text-xs bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded-full">{colTasks.length}</span>
                </div>
              </div>

              <div className="flex-1 p-2 space-y-2 min-h-[100px]">
                {colTasks.map(task => (
                  <div
                    key={task._id}
                    draggable
                    onDragStart={e => onDragStart(e, task)}
                    onClick={() => setSelectedTask(task)}
                    className="bg-[#1A3A6B] border border-blue-900 rounded-lg p-3 cursor-pointer hover:border-blue-600 transition-colors group"
                  >
                    <div className="flex items-start gap-1.5">
                      <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOTS[task.priority] || 'bg-gray-400'}`} />
                      <p className="text-xs text-gray-200 leading-snug">{task.title}</p>
                    </div>
                    {task.assignedTo && (
                      <p className="text-xs text-gray-500 mt-1.5 truncate">→ {task.assignedTo.name}</p>
                    )}
                    {task.dueDate && (
                      <p className={`text-xs mt-1 ${new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-red-400' : 'text-gray-500'}`}>
                        {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Quick add */}
              <div className="p-2 border-t border-blue-900">
                {showAdd === col.key ? (
                  <div className="space-y-1">
                    <input
                      autoFocus
                      value={addTitle}
                      onChange={e => setAddTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') quickAdd(col.key); if (e.key === 'Escape') setShowAdd(null) }}
                      placeholder="Task title..."
                      className="w-full bg-[#0A1628] border border-blue-700 rounded px-2 py-1 text-xs text-white placeholder-gray-500"
                    />
                    <div className="flex gap-1">
                      <button onClick={() => quickAdd(col.key)} disabled={adding}
                        className="flex-1 text-xs py-1 bg-[#1E6FD9] text-white rounded hover:bg-blue-600 disabled:opacity-50">
                        {adding ? '...' : 'Add'}
                      </button>
                      <button onClick={() => setShowAdd(null)} className="text-xs py-1 px-2 text-gray-400 hover:text-white">✕</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setShowAdd(col.key); setAddTitle('') }}
                    className="w-full text-xs text-gray-500 hover:text-gray-300 py-1 text-left transition-colors">
                    + Add task
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
    </>
  )
}
