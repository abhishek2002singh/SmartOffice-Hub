import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FileText, Plus, Search, Filter, BookOpen, CheckCircle, Clock, Archive } from 'lucide-react'
import sopApi from '../../../api/sop.api'

const STATUS_COLORS = {
  draft:      'bg-gray-700 text-gray-300',
  in_review:  'bg-yellow-900/50 text-yellow-300',
  published:  'bg-green-900/50 text-green-300',
  archived:   'bg-red-900/50 text-red-400',
}

const STATUS_ICONS = {
  draft:     Clock,
  in_review: Clock,
  published: CheckCircle,
  archived:  Archive,
}

const ADMIN_ROLES = ['SUPERADMIN', 'ADMIN', 'SUBADMIN', 'DEPT_HEAD']

function SOPCard({ sop, isAdmin }) {
  const Icon = STATUS_ICONS[sop.status] || FileText
  return (
    <Link
      to={`/sops/${sop._id}`}
      className="block p-5 rounded-xl border transition-all hover:border-blue-500/50 hover:bg-white/5"
      style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen size={18} className="text-blue-400 shrink-0 mt-0.5" />
          <h3 className="text-white font-semibold text-sm truncate">{sop.title}</h3>
        </div>
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 flex items-center gap-1 ${STATUS_COLORS[sop.status]}`}>
          <Icon size={11} />
          {sop.status.replace('_', ' ')}
        </span>
      </div>

      {sop.description && (
        <p className="text-gray-400 text-xs mt-2 line-clamp-2">{sop.description}</p>
      )}

      <div className="flex items-center gap-3 mt-3 flex-wrap">
        {sop.categoryId && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(30,111,217,0.2)', color: '#00C6FF' }}>
            {sop.categoryId.name}
          </span>
        )}
        {sop.mandatory && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-900/40 text-orange-300">
            Mandatory
          </span>
        )}
        {sop.tags?.map(tag => (
          <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
            #{tag}
          </span>
        ))}
        <span className="text-xs text-gray-600 ml-auto">v{sop.currentVersion}</span>
      </div>
    </Link>
  )
}

export default function SOPLibraryPage() {
  const navigate = useNavigate()
  const { user } = useSelector(s => s.auth)
  const isAdmin  = ADMIN_ROLES.includes(user?.role)

  const [sops, setSops]           = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]     = useState(true)
  const [q, setQ]                 = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [total, setTotal]         = useState(0)

  const fetchSOPs = async () => {
    setLoading(true)
    try {
      const params = { limit: 50 }
      if (q)            params.q = q
      if (statusFilter) params.status = statusFilter
      if (catFilter)    params.categoryId = catFilter
      const r = await sopApi.listSOPs(params)
      setSops(r.data.data.sops)
      setTotal(r.data.data.total)
    } catch { /* silent */ }
    setLoading(false)
  }

  useEffect(() => {
    sopApi.getCategories().then(r => setCategories(r.data.data.categories)).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(fetchSOPs, 300)
    return () => clearTimeout(t)
  }, [q, statusFilter, catFilter])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">SOP Library</h1>
          <p className="text-gray-400 text-sm mt-0.5">{total} SOPs · Standard Operating Procedures</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => navigate('/sops/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
            style={{ backgroundColor: '#1E6FD9' }}
          >
            <Plus size={16} /> New SOP
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search SOPs..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-sm text-white placeholder-gray-500 border focus:outline-none"
            style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(255,255,255,0.08)' }}
          />
        </div>

        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm text-white border"
          style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>

        {isAdmin && (
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm text-white border"
            style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="in_review">In Review</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        )}
      </div>

      {/* Quick links for admin */}
      {isAdmin && (
        <div className="flex gap-3 mb-6 flex-wrap">
          <Link to="/sops/approvals" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-yellow-300 border border-yellow-900/50 hover:bg-yellow-900/20">
            <Clock size={14} /> Approval Inbox
          </Link>
          <Link to="/sops/categories" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-blue-300 border border-blue-900/50 hover:bg-blue-900/20">
            <Filter size={14} /> Manage Categories
          </Link>
        </div>
      )}

      {/* SOP Grid */}
      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading SOPs...</div>
      ) : sops.length === 0 ? (
        <div className="text-center py-16">
          <FileText size={40} className="mx-auto text-gray-700 mb-3" />
          <p className="text-gray-500">No SOPs found</p>
          {isAdmin && <p className="text-gray-600 text-sm mt-1">Click "New SOP" to create the first one</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sops.map(sop => <SOPCard key={sop._id} sop={sop} isAdmin={isAdmin} />)}
        </div>
      )}
    </div>
  )
}
