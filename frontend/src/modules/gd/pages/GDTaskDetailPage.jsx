import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { gdApi } from '../../../api/gd.api'
import {
  Upload, Send, Trash2, CheckCircle, AlertTriangle, TruckIcon,
  Clock, ExternalLink, FileIcon, ImageIcon, Film, X, Plus, ChevronLeft,
} from 'lucide-react'

const STATUS_FLOW = ['new','in_progress','submitted','revision_requested','approved','delivered_to_client']
const STATUS_LABEL = {
  new:'New', in_progress:'In Progress', submitted:'Submitted',
  revision_requested:'Revision Requested', approved:'Approved', delivered_to_client:'Delivered to Client',
}
const STATUS_COLOR = {
  new:'#6b7280', in_progress:'#1E6FD9', submitted:'#ca8a04',
  revision_requested:'#FF6B00', approved:'#10b981', delivered_to_client:'#8b5cf6',
}
const PRIORITY_COLOR = { high:'#ef4444', medium:'#eab308', low:'#22c55e' }
const TYPE_LABEL = {
  video:'Video', reel:'Reel', image:'Image', carousel:'Carousel',
  poster:'Poster', thumbnail:'Thumbnail', banner:'Banner', other:'Other',
}
const DELIVERY_METHODS = ['whatsapp','email','call','other']

function FileCard({ file, onDelete, canDelete }) {
  const isImage = file.mimeType?.startsWith('image/')
  const isVideo = file.mimeType?.startsWith('video/')
  return (
    <div className="rounded-xl overflow-hidden border border-white/10" style={{ backgroundColor: '#0e2040' }}>
      <div className="h-28 flex items-center justify-center" style={{ backgroundColor: '#0A1628' }}>
        {isImage && file.thumbnailLink
          ? <img src={file.thumbnailLink} alt={file.fileName} className="h-full w-full object-cover" />
          : isVideo
          ? <Film size={32} className="text-blue-400" />
          : <FileIcon size={32} className="text-gray-400" />
        }
      </div>
      <div className="p-2">
        <p className="text-xs text-white truncate">{file.fileName}</p>
        <p className="text-xs text-gray-500 mt-0.5">v{file.version} · {file.fileType}</p>
        <div className="flex items-center gap-2 mt-1.5">
          {file.gdriveLink && (
            <a href={file.gdriveLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-400 hover:underline">
              <ExternalLink size={11} /> Open
            </a>
          )}
          {canDelete && (
            <button onClick={() => onDelete(file._id)} className="text-xs text-red-400 hover:text-red-300 ml-auto">
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function RevisionItem({ revision }) {
  return (
    <div className="p-3 rounded-xl border border-white/10" style={{ backgroundColor: '#0e2040' }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FF6B00', color: '#fff' }}>
          v{revision.version}
        </span>
        <span className="text-xs text-gray-400">{revision.requestedBy?.name}</span>
        <span className="text-xs text-gray-500 ml-auto">{new Date(revision.createdAt).toLocaleString('en-IN')}</span>
      </div>
      <p className="text-sm text-gray-200 whitespace-pre-wrap">{revision.revisionNotes}</p>
      {revision.resolvedAt && <p className="text-xs text-green-400 mt-1">Resolved</p>}
    </div>
  )
}

function CommentItem({ comment, onDelete, userId }) {
  const isOwn = comment.user?._id === userId
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
        style={{ backgroundColor: '#1A3A6B' }}>
        {comment.user?.name?.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{comment.user?.name}</span>
          <span className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleString('en-IN')}</span>
          {isOwn && (
            <button onClick={() => onDelete(comment._id)} className="ml-auto text-gray-600 hover:text-red-400">
              <Trash2 size={12} />
            </button>
          )}
        </div>
        <p className="text-sm text-gray-200 mt-0.5 whitespace-pre-wrap">{comment.message}</p>
      </div>
    </div>
  )
}

export default function GDTaskDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useSelector(s => s.auth)

  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [activeTab,  setActiveTab]  = useState('files')
  const fileInputRef = useRef(null)

  // Action modals state
  const [revisionModal,  setRevisionModal]  = useState(false)
  const [deliverModal,   setDeliverModal]   = useState(false)
  const [timeLogModal,   setTimeLogModal]   = useState(false)
  const [commentText,    setCommentText]    = useState('')
  const [revisionNotes,  setRevisionNotes]  = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState('whatsapp')
  const [deliveryNotes,  setDeliveryNotes]  = useState('')
  const [timeMinutes,    setTimeMinutes]    = useState('')
  const [uploading,      setUploading]      = useState(false)
  const [actionLoading,  setActionLoading]  = useState(false)
  const [uploadFileType, setUploadFileType] = useState('draft')
  const [err,            setErr]            = useState('')

  const fetchData = async () => {
    try {
      const res = await gdApi.getTask(id)
      setData(res.data.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [id])

  if (loading) return <div className="p-8 text-gray-400">Loading task…</div>
  if (!data?.task) return <div className="p-8 text-red-400">Task not found</div>

  const { task, files = [], revisions = [], comments = [], timeLogs = [] } = data

  const role = user?.role || ''
  const isAdmin = ['superadmin','admin','subadmin'].includes(role)
  const isAssignee = task.assignedTo?._id === user?._id
  const isAssigner = task.assignedBy?._id === user?._id

  const canSubmit  = isAssignee && ['new','in_progress','revision_requested'].includes(task.status)
  const canRevise  = (isAssigner || isAdmin) && task.status === 'submitted'
  const canApprove = (isAssigner || isAdmin) && task.status === 'submitted'
  const canDeliver = (isAssigner || isAdmin) && task.status === 'approved'
  const canUpload  = isAssignee || isAdmin

  const doAction = async (fn, ...args) => {
    setActionLoading(true); setErr('')
    try { await fn(...args); await fetchData() }
    catch (e) { setErr(e.response?.data?.error?.message || 'Action failed') }
    finally { setActionLoading(false) }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('fileType', uploadFileType)
      await gdApi.uploadFile(id, fd)
      await fetchData()
    } catch (e) {
      setErr(e.response?.data?.error?.message || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDeleteFile = async (fileId) => {
    if (!confirm('Delete this file?')) return
    await doAction(gdApi.deleteFile, id, fileId)
  }

  const handleAddComment = async () => {
    if (!commentText.trim()) return
    await doAction(() => gdApi.addComment(id, { message: commentText }))
    setCommentText('')
  }

  const handleDeleteComment = async (commentId) => {
    await doAction(gdApi.deleteComment, id, commentId)
  }

  const handleRequestRevision = async () => {
    if (!revisionNotes.trim()) { setErr('Revision notes required'); return }
    await doAction(() => gdApi.requestRevision(id, { revisionNotes }))
    setRevisionModal(false); setRevisionNotes('')
  }

  const handleDeliver = async () => {
    await doAction(() => gdApi.deliverTask(id, { deliveryMethod, deliveryNotes }))
    setDeliverModal(false)
  }

  const handleAddTimeLog = async () => {
    if (!timeMinutes || +timeMinutes < 1) { setErr('Enter valid minutes'); return }
    await doAction(() => gdApi.addTimeLog(id, { minutes: +timeMinutes }))
    setTimeLogModal(false); setTimeMinutes('')
  }

  const statusIndex = STATUS_FLOW.indexOf(task.status)

  return (
    <div className="p-4 md:p-6 space-y-5" style={{ color: '#fff' }}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(-1)} className="mt-1 text-gray-400 hover:text-white">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: STATUS_COLOR[task.status] + '33', color: STATUS_COLOR[task.status] }}>
              {STATUS_LABEL[task.status]}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: PRIORITY_COLOR[task.priority], backgroundColor: PRIORITY_COLOR[task.priority] + '22' }}>
              {task.priority} priority
            </span>
            <span className="text-xs text-gray-500">{TYPE_LABEL[task.type]}</span>
          </div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>{task.title}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {task.client?.companyName} · Assigned by {task.assignedBy?.name}
            {task.assignedTo && ` → ${task.assignedTo.name}`}
          </p>
        </div>
      </div>

      {/* Status progress bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STATUS_FLOW.map((s, i) => (
          <div key={s} className="flex items-center gap-1 shrink-0">
            <div className={`h-1.5 w-8 rounded-full transition-colors ${i <= statusIndex ? '' : 'bg-gray-700'}`}
              style={i <= statusIndex ? { backgroundColor: STATUS_COLOR[task.status] } : {}} />
            <span className={`text-xs ${i === statusIndex ? 'text-white font-medium' : 'text-gray-600'}`}>
              {STATUS_LABEL[s].split(' ')[0]}
            </span>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {canSubmit && (
          <button onClick={() => doAction(gdApi.submitTask, id)} disabled={actionLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: '#10b981', color: '#fff' }}>
            <CheckCircle size={14} /> Submit Work
          </button>
        )}
        {canRevise && (
          <button onClick={() => setRevisionModal(true)} disabled={actionLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: '#FF6B00', color: '#fff' }}>
            <AlertTriangle size={14} /> Request Revision
          </button>
        )}
        {canApprove && (
          <button onClick={() => doAction(gdApi.approveTask, id)} disabled={actionLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
            <CheckCircle size={14} /> Approve
          </button>
        )}
        {canDeliver && (
          <button onClick={() => setDeliverModal(true)} disabled={actionLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: '#8b5cf6', color: '#fff' }}>
            <TruckIcon size={14} /> Deliver to Client
          </button>
        )}
        <button onClick={() => setTimeLogModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border border-white/20 text-gray-300 hover:bg-white/5">
          <Clock size={14} /> Log Time
        </button>
      </div>

      {err && <p className="text-red-400 text-sm">{err}</p>}

      <div className="grid md:grid-cols-3 gap-5">
        {/* Left: details */}
        <div className="space-y-4 md:col-span-1">
          <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: '#1A3A6B' }}>
            <h3 className="text-sm font-semibold text-gray-300">Details</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Client"     value={task.client?.companyName} />
              <InfoRow label="Type"       value={TYPE_LABEL[task.type]} />
              <InfoRow label="Priority"   value={task.priority} />
              <InfoRow label="Source"     value={task.sourceModule} />
              <InfoRow label="Due"        value={task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN') : '—'} />
              <InfoRow label="Assigned"   value={new Date(task.assignedDate).toLocaleDateString('en-IN')} />
              {task.revisionCount > 0 && <InfoRow label="Revisions" value={task.revisionCount} />}
              {task.deliveryMethod && <InfoRow label="Delivered via" value={task.deliveryMethod} />}
            </div>
          </div>

          {task.brief && (
            <div className="rounded-2xl p-4" style={{ backgroundColor: '#1A3A6B' }}>
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Brief</h3>
              <p className="text-sm text-gray-200 whitespace-pre-wrap">{task.brief}</p>
            </div>
          )}

          {task.referenceLinks?.length > 0 && (
            <div className="rounded-2xl p-4" style={{ backgroundColor: '#1A3A6B' }}>
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Reference Links</h3>
              {task.referenceLinks.map((link, i) => (
                <a key={i} href={link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-400 hover:underline mb-1">
                  <ExternalLink size={12} /> {link}
                </a>
              ))}
            </div>
          )}

          {/* Time logs */}
          {timeLogs.length > 0 && (
            <div className="rounded-2xl p-4" style={{ backgroundColor: '#1A3A6B' }}>
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Time Logged</h3>
              {timeLogs.map(log => (
                <div key={log._id} className="flex justify-between text-sm py-1 border-b border-white/5 last:border-0">
                  <span className="text-gray-300">{log.user?.name}</span>
                  <span className="text-white font-medium">{log.minutes}m</span>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-1 font-bold">
                <span className="text-gray-400">Total</span>
                <span className="text-white">{timeLogs.reduce((a, l) => a + l.minutes, 0)}m</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: tabs */}
        <div className="md:col-span-2 space-y-4">
          {/* Tab bar */}
          <div className="flex gap-1 rounded-xl p-1" style={{ backgroundColor: '#1A3A6B' }}>
            {['files','revisions','comments'].map(tab => (
              <button key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 text-sm rounded-lg font-medium transition-colors capitalize ${activeTab === tab ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                style={activeTab === tab ? { backgroundColor: '#1E6FD9' } : {}}>
                {tab} {tab === 'files' ? `(${files.length})` : tab === 'revisions' ? `(${revisions.length})` : `(${comments.length})`}
              </button>
            ))}
          </div>

          {/* Files tab */}
          {activeTab === 'files' && (
            <div className="space-y-3">
              {canUpload && (
                <div className="flex items-center gap-3">
                  <select
                    value={uploadFileType} onChange={e => setUploadFileType(e.target.value)}
                    className="px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-white outline-none">
                    <option value="draft">Draft</option>
                    <option value="final">Final</option>
                    <option value="reference">Reference</option>
                  </select>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                    style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
                    <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload File'}
                  </button>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                </div>
              )}
              {files.length === 0
                ? <p className="text-sm text-gray-400 py-4 text-center">No files yet</p>
                : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {files.map(f => (
                      <FileCard key={f._id} file={f}
                        onDelete={handleDeleteFile}
                        canDelete={canUpload || isAdmin}
                      />
                    ))}
                  </div>
                )
              }
            </div>
          )}

          {/* Revisions tab */}
          {activeTab === 'revisions' && (
            <div className="space-y-3">
              {revisions.length === 0
                ? <p className="text-sm text-gray-400 py-4 text-center">No revisions requested</p>
                : revisions.map(r => <RevisionItem key={r._id} revision={r} />)
              }
            </div>
          )}

          {/* Comments tab */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              <div className="space-y-3">
                {comments.length === 0
                  ? <p className="text-sm text-gray-400 py-2 text-center">No comments yet</p>
                  : comments.map(c => (
                    <CommentItem key={c._id} comment={c}
                      onDelete={handleDeleteComment}
                      userId={user?._id}
                    />
                  ))
                }
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-blue-500"
                  placeholder="Add a comment…"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment() } }}
                />
                <button onClick={handleAddComment} disabled={!commentText.trim()}
                  className="px-3 py-2 rounded-xl disabled:opacity-30"
                  style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Revision Request Modal */}
      {revisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Request Revision</h3>
              <button onClick={() => setRevisionModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <textarea rows={4}
              className="w-full px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none resize-none"
              placeholder="Describe what needs to be changed…"
              value={revisionNotes} onChange={e => setRevisionNotes(e.target.value)}
            />
            {err && <p className="text-red-400 text-xs">{err}</p>}
            <div className="flex gap-3">
              <button onClick={() => setRevisionModal(false)} className="flex-1 py-2 rounded-xl text-sm border border-white/20 text-gray-300">Cancel</button>
              <button onClick={handleRequestRevision} disabled={actionLoading}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: '#FF6B00' }}>
                {actionLoading ? 'Sending…' : 'Send Revision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deliver Modal */}
      {deliverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Deliver to Client</h3>
              <button onClick={() => setDeliverModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <select
              className="w-full px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-white outline-none"
              value={deliveryMethod} onChange={e => setDeliveryMethod(e.target.value)}>
              {DELIVERY_METHODS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
            <textarea rows={3}
              className="w-full px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none resize-none"
              placeholder="Delivery notes (optional)"
              value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)}
            />
            {err && <p className="text-red-400 text-xs">{err}</p>}
            <div className="flex gap-3">
              <button onClick={() => setDeliverModal(false)} className="flex-1 py-2 rounded-xl text-sm border border-white/20 text-gray-300">Cancel</button>
              <button onClick={handleDeliver} disabled={actionLoading}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: '#8b5cf6' }}>
                {actionLoading ? 'Marking…' : 'Confirm Delivery'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Log Modal */}
      {timeLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xs rounded-2xl p-6 space-y-4" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Log Time</h3>
              <button onClick={() => setTimeLogModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <input type="number" min="1"
              className="w-full px-3 py-2 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none"
              placeholder="Minutes worked"
              value={timeMinutes} onChange={e => setTimeMinutes(e.target.value)}
            />
            {err && <p className="text-red-400 text-xs">{err}</p>}
            <div className="flex gap-3">
              <button onClick={() => setTimeLogModal(false)} className="flex-1 py-2 rounded-xl text-sm border border-white/20 text-gray-300">Cancel</button>
              <button onClick={handleAddTimeLog} disabled={actionLoading}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: '#1E6FD9' }}>
                {actionLoading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  )
}
