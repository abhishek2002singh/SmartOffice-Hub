import { useState, useEffect, useCallback } from 'react'
import { devApi } from '../../../api/dev.api'
import DevTimerWidget from './DevTimerWidget'

const STATUS_OPTIONS = ['backlog','todo','in_progress','code_review','testing','done','blocked']
const PRIORITY_COLORS = { critical: 'text-red-400', high: 'text-orange-400', medium: 'text-yellow-400', low: 'text-green-400' }
const STATUS_COLORS = {
  backlog:     'bg-gray-700 text-gray-300',
  todo:        'bg-blue-900/40 text-blue-300',
  in_progress: 'bg-yellow-900/30 text-yellow-300',
  code_review: 'bg-purple-900/30 text-purple-300',
  testing:     'bg-cyan-900/30 text-cyan-300',
  done:        'bg-green-900/30 text-green-300',
  blocked:     'bg-red-900/30 text-red-300',
}

export default function DevTaskDetailModal({ task: initialTask, projectId, onClose, onUpdated }) {
  const [task, setTask]         = useState(initialTask)
  const [comments, setComments] = useState([])
  const [timeLogs, setTimeLogs] = useState([])
  const [commentMsg, setCommentMsg] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [activeTab, setActiveTab] = useState('comments')
  const [editDesc, setEditDesc] = useState(false)
  const [desc, setDesc]         = useState(initialTask.description || '')
  const [saving, setSaving]     = useState(false)

  const loadComments = useCallback(async () => {
    try {
      const r = await devApi.listTaskComments(projectId, task._id)
      setComments(r.data.data.comments || [])
    } catch (e) { console.error(e) }
  }, [projectId, task._id])

  const loadTimeLogs = useCallback(async () => {
    // Time logs come from task itself in actual implementation
    // We'll store them in local state after adding
  }, [])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  const updateStatus = async (status) => {
    try {
      const r = await devApi.updateTask(projectId, task._id, { status })
      setTask(r.data.data.task)
      onUpdated?.()
    } catch (e) { console.error(e) }
  }

  const saveDescription = async () => {
    setSaving(true)
    try {
      const r = await devApi.updateTask(projectId, task._id, { description: desc })
      setTask(r.data.data.task)
      setEditDesc(false)
      onUpdated?.()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const postComment = async (e) => {
    e.preventDefault()
    if (!commentMsg.trim()) return
    setPostingComment(true)
    try {
      await devApi.addTaskComment(projectId, task._id, { message: commentMsg.trim() })
      setCommentMsg('')
      await loadComments()
    } catch (e) { console.error(e) }
    finally { setPostingComment(false) }
  }

  const deleteComment = async (commentId) => {
    try {
      await devApi.deleteTaskComment(projectId, task._id, commentId)
      await loadComments()
    } catch (e) { console.error(e) }
  }

  const onTimeLogged = async (minutes, notes) => {
    await devApi.addTimeLog(projectId, task._id, { minutes, notes })
    // Refresh task for updated actualHours
    const r = await devApi.listTasks(projectId, { limit: 1 })
    // Just update local actualHours approximation
    setTask(t => ({ ...t, actualHours: (t.actualHours || 0) + Math.round(minutes / 60 * 10) / 10 }))
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#0A1628] border border-blue-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-blue-900">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <select
                value={task.status}
                onChange={e => updateStatus(e.target.value)}
                className={`text-xs px-2 py-1 rounded-full cursor-pointer border border-transparent ${STATUS_COLORS[task.status]}`}
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
              <span className={`text-xs font-semibold ${PRIORITY_COLORS[task.priority]}`}>
                {task.priority} priority
              </span>
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                {task.type?.replace('_', ' ')}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">{task.title}</h2>
            {task.assignedTo && (
              <p className="text-sm text-gray-400 mt-1">Assigned to: <span className="text-gray-300">{task.assignedTo.name || task.assignedTo}</span></p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none shrink-0">×</button>
        </div>

        <div className="grid grid-cols-3 divide-x divide-blue-900">
          {/* Main content — 2/3 */}
          <div className="col-span-2 p-6 space-y-5">
            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-300">Description</h3>
                {!editDesc && (
                  <button onClick={() => setEditDesc(true)} className="text-xs text-gray-500 hover:text-[#00C6FF]">Edit</button>
                )}
              </div>
              {editDesc ? (
                <div className="space-y-2">
                  <textarea
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    rows={4}
                    autoFocus
                    className="w-full bg-[#1A3A6B] border border-blue-700 rounded-lg px-3 py-2 text-white text-sm resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveDescription} disabled={saving}
                      className="text-sm px-3 py-1.5 bg-[#1E6FD9] text-white rounded-lg disabled:opacity-50">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => { setEditDesc(false); setDesc(task.description || '') }}
                      className="text-sm text-gray-400 hover:text-white px-3 py-1.5">Cancel</button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 min-h-[2rem]">
                  {task.description || <span className="italic">No description. Click Edit to add one.</span>}
                </p>
              )}
            </div>

            {/* Tabs */}
            <div>
              <div className="flex gap-1 border-b border-blue-900 mb-4">
                {['comments', 'time_logs'].map(t => (
                  <button key={t} onClick={() => setActiveTab(t)}
                    className={`text-sm px-4 py-2 border-b-2 transition-colors ${activeTab === t ? 'border-[#1E6FD9] text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>
                    {t === 'comments' ? `Comments (${comments.length})` : 'Time Logs'}
                  </button>
                ))}
              </div>

              {activeTab === 'comments' && (
                <div className="space-y-3">
                  {comments.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No comments yet.</p>
                  ) : (
                    comments.map(c => (
                      <div key={c._id} className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#1E6FD9] flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {c.user?.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 bg-[#1A3A6B] rounded-xl px-4 py-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-300">{c.user?.name || 'User'}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                {new Date(c.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                {' '}
                                {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              </span>
                              <button onClick={() => deleteComment(c._id)} className="text-gray-600 hover:text-red-400 text-xs">✕</button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-200">{c.message}</p>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Post comment */}
                  <form onSubmit={postComment} className="flex gap-2 mt-3">
                    <input
                      value={commentMsg}
                      onChange={e => setCommentMsg(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 bg-[#1A3A6B] border border-blue-800 rounded-xl px-4 py-2 text-white text-sm placeholder-gray-500"
                    />
                    <button type="submit" disabled={postingComment || !commentMsg.trim()}
                      className="px-4 py-2 bg-[#1E6FD9] hover:bg-blue-600 text-white rounded-xl text-sm disabled:opacity-40">
                      {postingComment ? '...' : 'Post'}
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'time_logs' && (
                <DevTimerWidget
                  projectId={projectId}
                  taskId={task._id}
                  actualHours={task.actualHours || 0}
                  estimatedHours={task.estimatedHours}
                  onLogged={() => setTask(t => ({ ...t, actualHours: (t.actualHours || 0) + 0 }))}
                />
              )}
            </div>
          </div>

          {/* Sidebar — 1/3 */}
          <div className="p-5 space-y-5">
            <div className="space-y-3 text-sm">
              <InfoRow label="Estimate" value={task.estimatedHours ? `${task.estimatedHours}h` : '—'} />
              <InfoRow label="Logged"   value={task.actualHours ? `${task.actualHours}h` : '0h'} />
              {task.dueDate && (
                <InfoRow
                  label="Due"
                  value={new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  warn={task.status !== 'done' && new Date(task.dueDate) < new Date()}
                />
              )}
              {task.completedDate && (
                <InfoRow label="Completed" value={new Date(task.completedDate).toLocaleDateString('en-IN')} />
              )}
              {task.milestoneId && (
                <InfoRow label="Milestone" value={task.milestoneId.title || '—'} />
              )}
            </div>

            {task.tags?.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {task.tags.map((t, i) => (
                    <span key={i} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick status buttons */}
            <div>
              <p className="text-xs text-gray-400 mb-2">Move to</p>
              <div className="grid grid-cols-2 gap-1">
                {STATUS_OPTIONS.filter(s => s !== task.status).map(s => (
                  <button key={s} onClick={() => updateStatus(s)}
                    className="text-xs px-2 py-1.5 bg-[#1A3A6B] hover:bg-blue-800 text-gray-300 rounded-lg transition-colors text-left">
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, warn }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={warn ? 'text-red-400' : 'text-gray-300'}>{value}</span>
    </div>
  )
}
