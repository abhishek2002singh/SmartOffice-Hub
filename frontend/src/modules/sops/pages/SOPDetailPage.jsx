import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import ReactMarkdown from 'react-markdown'
import { ArrowLeft, Edit2, CheckCircle, Clock, Archive, History, Send, Eye, Trash2 } from 'lucide-react'
import sopApi from '../../../api/sop.api'

const ADMIN_ROLES = ['SUPERADMIN', 'ADMIN', 'SUBADMIN', 'DEPT_HEAD']

const STATUS_COLORS = {
  draft:     'text-gray-400 bg-gray-800',
  in_review: 'text-yellow-300 bg-yellow-900/40',
  published: 'text-green-300 bg-green-900/40',
  archived:  'text-red-400 bg-red-900/40',
}

function AcknowledgeModal({ sop, onDone, onClose }) {
  const { user } = useSelector(s => s.auth)
  const [sig, setSig]       = useState('')
  const [read, setRead]     = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  const submit = async () => {
    if (!read || !sig.trim()) { setErr('Please confirm you have read this SOP and enter your name.'); return }
    setSaving(true)
    try {
      await sopApi.acknowledgeSOP(sop._id, { signature: sig.trim() })
      onDone()
    } catch (e) {
      setErr(e.response?.data?.error?.message || 'Failed to acknowledge')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="rounded-2xl p-6 w-full max-w-md" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.1)' }}>
        <h3 className="text-white font-bold text-lg mb-2">Acknowledge SOP</h3>
        <p className="text-gray-400 text-sm mb-4">
          By acknowledging, you confirm that you have read and understood <strong className="text-white">{sop.title}</strong> (v{sop.currentVersion}).
        </p>
        <label className="flex items-start gap-3 mb-4 cursor-pointer">
          <input type="checkbox" checked={read} onChange={e => setRead(e.target.checked)} className="mt-1" />
          <span className="text-gray-300 text-sm">I have read and understood this SOP</span>
        </label>
        <input
          value={sig}
          onChange={e => setSig(e.target.value)}
          placeholder="Type your full name as signature"
          className="w-full px-3 py-2 rounded-xl text-sm text-white border mb-4"
          style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(255,255,255,0.15)' }}
        />
        {err && <p className="text-red-400 text-xs mb-3">{err}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-gray-400 border text-sm" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>Cancel</button>
          <button onClick={submit} disabled={saving} className="flex-1 py-2 rounded-xl text-white text-sm font-medium" style={{ backgroundColor: '#1E6FD9' }}>
            {saving ? 'Saving...' : 'Acknowledge'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SOPDetailPage() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { user }   = useSelector(s => s.auth)
  const isAdmin    = ADMIN_ROLES.includes(user?.role)
  const canPublish = ['SUPERADMIN', 'ADMIN'].includes(user?.role)

  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAck, setShowAck] = useState(false)
  const [action, setAction]   = useState('')
  const [versions, setVersions] = useState([])
  const [showVersions, setShowVersions] = useState(false)

  const fetchSOP = async () => {
    setLoading(true)
    try {
      const r = await sopApi.getSOPById(id)
      setData(r.data.data)
    } catch (e) {
      if (e.response?.status === 404) navigate('/sops')
    }
    setLoading(false)
  }

  useEffect(() => { fetchSOP() }, [id])

  const handleAction = async (type) => {
    setAction(type)
    try {
      if (type === 'submit')  await sopApi.submitForApproval(id)
      if (type === 'publish') await sopApi.publishSOP(id)
      if (type === 'archive') { if (!confirm('Archive this SOP?')) { setAction(''); return } await sopApi.archiveSOP(id) }
      if (type === 'delete')  { if (!confirm('Delete this SOP?')) { setAction(''); return } await sopApi.deleteSOP(id); navigate('/sops'); return }
      fetchSOP()
    } catch (e) {
      alert(e.response?.data?.error?.message || 'Action failed')
    }
    setAction('')
  }

  const loadVersions = async () => {
    if (!showVersions) {
      const r = await sopApi.getVersionHistory(id)
      setVersions(r.data.data.versions)
    }
    setShowVersions(v => !v)
  }

  if (loading) return <div className="p-6 text-center text-gray-500">Loading SOP...</div>
  if (!data)   return null

  const { sop, pendingApproval, acknowledged, myAck } = data
  const StatusBadge = () => (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[sop.status]}`}>
      {sop.status.replace('_', ' ')}
    </span>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {showAck && <AcknowledgeModal sop={sop} onDone={() => { setShowAck(false); fetchSOP() }} onClose={() => setShowAck(false)} />}

      {/* Back + title */}
      <div className="flex items-start gap-3 mb-6">
        <button onClick={() => navigate('/sops')} className="mt-1 text-gray-500 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{sop.title}</h1>
            <StatusBadge />
            <span className="text-xs text-gray-500">v{sop.currentVersion}</span>
          </div>
          {sop.categoryId && (
            <p className="text-xs mt-1" style={{ color: '#00C6FF' }}>{sop.categoryId.name}</p>
          )}
          {sop.description && <p className="text-gray-400 text-sm mt-1">{sop.description}</p>}
        </div>
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap gap-4 mb-6 text-xs text-gray-500">
        {sop.publishedAt && <span>Published {new Date(sop.publishedAt).toLocaleDateString('en-IN')}</span>}
        {sop.publishedBy && <span>by {sop.publishedBy.name}</span>}
        {sop.mandatory && <span className="text-orange-400 font-medium">Mandatory</span>}
        {sop.tags?.map(t => <span key={t} className="text-gray-600">#{t}</span>)}
      </div>

      {/* Acknowledgement notice */}
      {sop.status === 'published' && !acknowledged && (
        <div className="mb-6 p-4 rounded-xl border flex items-center justify-between gap-4" style={{ backgroundColor: 'rgba(30,111,217,0.1)', borderColor: 'rgba(30,111,217,0.3)' }}>
          <div>
            <p className="text-blue-300 font-medium text-sm">Action Required</p>
            <p className="text-gray-400 text-xs mt-0.5">Please read this SOP and acknowledge when done.</p>
          </div>
          <button onClick={() => setShowAck(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium shrink-0" style={{ backgroundColor: '#1E6FD9' }}>
            <CheckCircle size={15} /> Acknowledge
          </button>
        </div>
      )}

      {sop.status === 'published' && acknowledged && (
        <div className="mb-6 p-3 rounded-xl flex items-center gap-2 text-green-300 text-sm" style={{ backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <CheckCircle size={15} />
          Acknowledged on {new Date(myAck?.acknowledgedAt).toLocaleDateString('en-IN')}
        </div>
      )}

      {/* Approval status */}
      {sop.status === 'in_review' && pendingApproval && (
        <div className="mb-6 p-3 rounded-xl flex items-center gap-2 text-yellow-300 text-sm" style={{ backgroundColor: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)' }}>
          <Clock size={15} />
          Submitted for approval by {pendingApproval.requestedBy?.name} · Waiting for reviewer
          {canPublish && (
            <button onClick={() => handleAction('publish')} disabled={!!action} className="ml-auto px-3 py-1 rounded-lg text-white text-xs" style={{ backgroundColor: '#1E6FD9' }}>
              Publish Now
            </button>
          )}
        </div>
      )}

      {/* Admin actions */}
      {isAdmin && (
        <div className="flex flex-wrap gap-2 mb-6">
          {['draft', 'in_review'].includes(sop.status) && (
            <Link to={`/sops/${id}/edit`} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm text-white border" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
              <Edit2 size={14} /> Edit
            </Link>
          )}
          {sop.status === 'draft' && (
            <button onClick={() => handleAction('submit')} disabled={!!action} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm text-yellow-300 border border-yellow-900/50">
              <Send size={14} /> Submit for Approval
            </button>
          )}
          {sop.status === 'in_review' && canPublish && (
            <button onClick={() => handleAction('publish')} disabled={!!action} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm text-green-300 border border-green-900/50">
              <Eye size={14} /> Publish
            </button>
          )}
          {sop.status === 'draft' && canPublish && (
            <button onClick={() => handleAction('publish')} disabled={!!action} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm text-green-300 border border-green-900/50">
              <Eye size={14} /> Publish Directly
            </button>
          )}
          {sop.status === 'published' && (
            <Link to={`/sops/${id}/edit`} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm text-blue-300 border border-blue-900/50">
              <Edit2 size={14} /> New Version
            </Link>
          )}
          {sop.status !== 'archived' && (
            <button onClick={() => handleAction('archive')} disabled={!!action} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm text-gray-400 border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <Archive size={14} /> Archive
            </button>
          )}
          <button onClick={() => handleAction('delete')} disabled={!!action} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm text-red-400 border border-red-900/50">
            <Trash2 size={14} /> Delete
          </button>
          <button onClick={loadVersions} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm text-gray-400 border ml-auto" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <History size={14} /> Version History
          </button>
        </div>
      )}

      {/* Version history */}
      {showVersions && (
        <div className="mb-6 p-4 rounded-xl border" style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(255,255,255,0.08)' }}>
          <h4 className="text-white text-sm font-medium mb-3">Version History</h4>
          {versions.map(v => (
            <div key={v._id} className="flex items-center gap-3 py-2 border-t text-sm" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <span className="text-blue-400 font-mono">v{v.versionNumber}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[v.status]}`}>{v.status}</span>
              <span className="text-gray-400 flex-1">{v.changeLog}</span>
              <span className="text-gray-600 text-xs">{v.createdBy?.name}</span>
              <span className="text-gray-600 text-xs">{new Date(v.createdAt).toLocaleDateString('en-IN')}</span>
            </div>
          ))}
        </div>
      )}

      {/* Markdown content */}
      <div className="prose prose-invert prose-sm max-w-none p-6 rounded-xl border" style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(255,255,255,0.08)' }}>
        {sop.content ? (
          <ReactMarkdown
            components={{
              h1: ({children}) => <h1 className="text-xl font-bold text-white mt-4 mb-2">{children}</h1>,
              h2: ({children}) => <h2 className="text-lg font-semibold text-white mt-4 mb-2">{children}</h2>,
              h3: ({children}) => <h3 className="text-base font-semibold text-gray-200 mt-3 mb-1">{children}</h3>,
              p:  ({children}) => <p className="text-gray-300 mb-3 leading-relaxed">{children}</p>,
              ul: ({children}) => <ul className="list-disc list-inside text-gray-300 mb-3 space-y-1">{children}</ul>,
              ol: ({children}) => <ol className="list-decimal list-inside text-gray-300 mb-3 space-y-1">{children}</ol>,
              li: ({children}) => <li className="text-gray-300">{children}</li>,
              strong: ({children}) => <strong className="text-white font-semibold">{children}</strong>,
              code: ({children}) => <code className="bg-white/10 px-1 py-0.5 rounded text-blue-300 text-xs">{children}</code>,
              blockquote: ({children}) => <blockquote className="border-l-4 border-blue-500 pl-4 text-gray-400 italic my-3">{children}</blockquote>,
              hr: () => <hr className="border-white/10 my-4" />,
            }}
          >
            {sop.content}
          </ReactMarkdown>
        ) : (
          <p className="text-gray-500 italic">No content added yet.</p>
        )}
      </div>
    </div>
  )
}
