import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { hrApi } from '../../../api/hr.api'
import { X, Trash2, Archive } from 'lucide-react'
import SkillFilter from '../components/SkillFilter'
import DeleteModal from '../../../components/DeleteModal'

const PROFILES  = ['Sales', 'DM', 'GD', 'Development', 'HR', 'Admin']
const STATUSES  = ['New', 'Shortlisted', 'Interview Done', 'Selected', 'Rejected', 'On Hold']
const SOURCES   = ['Internshala', 'Workindia', 'Indeed', 'LinkedIn', 'Walk-in', 'Reference', 'Others']
const FOR_TYPES = ['Internship', 'Full Time', 'Part Time', 'Freelance', 'WFH']

const STATUS_COLORS = {
  'New':           'bg-blue-900/40 text-blue-300',
  'Shortlisted':   'bg-yellow-900/30 text-yellow-300',
  'Interview Done':'bg-purple-900/30 text-purple-300',
  'Selected':      'bg-green-900/30 text-green-300',
  'Rejected':      'bg-red-900/30 text-red-300',
  'On Hold':       'bg-gray-700 text-gray-300',
}
const PRIORITY_COLORS = { High: 'text-red-400', Medium: 'text-yellow-400', Low: 'text-green-400' }

export default function CandidateListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user: me } = useSelector(s => s.auth)

  const isAdmin      = ['ADMIN', 'SUPERADMIN'].includes(me?.role)
  const isSuperadmin = me?.role === 'SUPERADMIN'
  const canDelete    = isAdmin || me?.permissions?.includes('hr:candidate:delete')

  const [candidates, setCandidates] = useState([])
  const [total, setTotal]           = useState(0)
  const [pages, setPages]           = useState(1)
  const [loading, setLoading]       = useState(true)
  const [fetchError, setFetchError] = useState('')

  // Multi-select
  const [selectedIds, setSelectedIds] = useState([])

  // Delete modal
  const [deleteModal, setDeleteModal] = useState({ open: false, type: 'soft', candidate: null })
  const [deleting, setDeleting]       = useState(false)
  const [deleteErr, setDeleteErr]     = useState('')

  // URL-synced state
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
  const [selectedSkills, setSelectedSkills] = useState(
    () => searchParams.get('skills')?.split(',').filter(Boolean) || []
  )
  const [skillMatch, setSkillMatch] = useState(searchParams.get('skillMatch') || 'any')
  const [filters, setFilters] = useState({
    q:              searchParams.get('q')              || '',
    status:         searchParams.get('status')         || '',
    appliedProfile: searchParams.get('appliedProfile') || '',
    appliedFor:     searchParams.get('appliedFor')     || '',
    leadSource:     searchParams.get('leadSource')     || '',
    gender:         searchParams.get('gender')         || '',
    minExp:         searchParams.get('minExp')         || '',
    maxExp:         searchParams.get('maxExp')         || '',
    minSalary:      searchParams.get('minSalary')      || '',
    maxSalary:      searchParams.get('maxSalary')      || '',
  })

  const debounceRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    try {
      const params = {
        page, limit: 20,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')),
      }
      if (selectedSkills.length) {
        params.skills = selectedSkills.join(',')
        if (selectedSkills.length > 1) params.skillMatch = skillMatch
      }
      const r = await hrApi.listCandidates(params)
      setCandidates(r.data.data.candidates || [])
      setTotal(r.data.data.total || 0)
      setPages(r.data.data.pages || 1)
    } catch (e) {
      setFetchError(e.response?.data?.error?.message || 'Failed to load candidates')
    } finally { setLoading(false) }
  }, [filters, page, selectedSkills, skillMatch])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(load, 300)
    return () => clearTimeout(debounceRef.current)
  }, [load])

  // URL sync
  useEffect(() => {
    const p = {}
    if (filters.q)              p.q              = filters.q
    if (filters.status)         p.status         = filters.status
    if (filters.appliedProfile) p.appliedProfile = filters.appliedProfile
    if (filters.appliedFor)     p.appliedFor     = filters.appliedFor
    if (filters.leadSource)     p.leadSource     = filters.leadSource
    if (filters.gender)         p.gender         = filters.gender
    if (filters.minExp)         p.minExp         = filters.minExp
    if (filters.maxExp)         p.maxExp         = filters.maxExp
    if (filters.minSalary)      p.minSalary      = filters.minSalary
    if (filters.maxSalary)      p.maxSalary      = filters.maxSalary
    if (selectedSkills.length)  p.skills         = selectedSkills.join(',')
    if (selectedSkills.length > 1) p.skillMatch  = skillMatch
    if (page > 1)               p.page           = String(page)
    setSearchParams(p, { replace: true })
  }, [filters, selectedSkills, skillMatch, page, setSearchParams])

  const set = (k, v) => { setFilters(f => ({ ...f, [k]: v })); setPage(1) }
  const handleSkillsChange = (s) => { setSelectedSkills(s); setPage(1) }
  const removeSkill = (skill) => { setSelectedSkills(s => s.filter(x => x !== skill)); setPage(1) }
  const clearAll = () => {
    setFilters({ q:'',status:'',appliedProfile:'',appliedFor:'',leadSource:'',gender:'',minExp:'',maxExp:'',minSalary:'',maxSalary:'' })
    setSelectedSkills([]); setSkillMatch('any'); setPage(1)
  }
  const hasActiveFilters = selectedSkills.length > 0 || Object.values(filters).some(v => v !== '')

  // ── Selection ────────────────────────────────────────────────────────────────
  const toggleSelect = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const toggleAll = (e) =>
    setSelectedIds(e.target.checked ? candidates.map(c => c._id) : [])
  const allSelected = selectedIds.length > 0 && selectedIds.length === candidates.length

  // ── Delete handlers ──────────────────────────────────────────────────────────
  const openDelete = (candidate, type = 'soft', e) => {
    e?.stopPropagation()
    setDeleteErr('')
    setDeleteModal({ open: true, type, candidate })
  }

  const confirmSingleDelete = async ({ confirmText, reason }) => {
    const { candidate, type } = deleteModal
    setDeleting(true)
    setDeleteErr('')
    try {
      if (type === 'hard') {
        await hrApi.hardDeleteCandidate(candidate._id, { confirmText })
      } else {
        await hrApi.deleteCandidate(candidate._id)
      }
      setDeleteModal({ open: false, type: 'soft', candidate: null })
      load()
    } catch (e) {
      setDeleteErr(e.response?.data?.error?.message || 'Delete failed')
    } finally { setDeleting(false) }
  }

  const bulkSoftDelete = async () => {
    if (!selectedIds.length) return
    setDeleting(true)
    try {
      await hrApi.bulkSoftDeleteCandidates(selectedIds)
      setSelectedIds([])
      load()
    } catch (e) {
      alert(e.response?.data?.error?.message || 'Bulk delete failed')
    } finally { setDeleting(false) }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Candidates</h1>
          <p className="text-gray-400 text-sm mt-1">
            {loading ? 'Loading...' : `${total} candidate${total !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <div className="flex gap-3 items-center">
          {canDelete && (
            <Link to="/hr/candidates/archive"
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-blue-900 rounded-lg px-3 py-2 transition-colors">
              <Archive size={13} /> Archive
            </Link>
          )}
          <button onClick={() => navigate('/hr/candidates/import')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm">
            Bulk Import
          </button>
          <button onClick={() => navigate('/hr/candidates/new')}
            className="px-4 py-2 bg-[#1E6FD9] hover:bg-blue-600 text-white rounded-xl text-sm font-medium">
            + Add Candidate
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.length > 0 && canDelete && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ backgroundColor: 'rgba(30,111,217,0.15)', border: '1px solid rgba(30,111,217,0.4)' }}>
          <span className="text-sm text-blue-300 font-medium">{selectedIds.length} selected</span>
          <button onClick={bulkSoftDelete} disabled={deleting}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-orange-700 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50 transition-colors">
            <Trash2 size={12} /> Archive Selected
          </button>
          <button onClick={() => setSelectedIds([])}
            className="text-xs text-gray-400 hover:text-white transition-colors">
            Clear selection
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-[#0A1628] border border-blue-900 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <input value={filters.q} onChange={e => set('q', e.target.value)}
            placeholder="Search name, phone, company..."
            className="col-span-2 bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500" />
          <select value={filters.status} onChange={e => set('status', e.target.value)}
            className="bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm">
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.appliedProfile} onChange={e => set('appliedProfile', e.target.value)}
            className="bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm">
            <option value="">All Profiles</option>
            {PROFILES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filters.appliedFor} onChange={e => set('appliedFor', e.target.value)}
            className="bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm">
            <option value="">All Types</option>
            {FOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filters.leadSource} onChange={e => set('leadSource', e.target.value)}
            className="bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm">
            <option value="">All Sources</option>
            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.gender} onChange={e => set('gender', e.target.value)}
            className="bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm">
            <option value="">Any Gender</option>
            {['Male', 'Female', 'Other'].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <input type="number" value={filters.minExp} onChange={e => set('minExp', e.target.value)}
            placeholder="Min Exp (yrs)"
            className="bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500" />
          <input type="number" value={filters.maxExp} onChange={e => set('maxExp', e.target.value)}
            placeholder="Max Exp (yrs)"
            className="bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500" />
          <input type="number" value={filters.minSalary} onChange={e => set('minSalary', e.target.value)}
            placeholder="Min Salary (₹)"
            className="bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500" />
          <input type="number" value={filters.maxSalary} onChange={e => set('maxSalary', e.target.value)}
            placeholder="Max Salary (₹)"
            className="bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500" />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <SkillFilter selectedSkills={selectedSkills} onChange={handleSkillsChange} profile={filters.appliedProfile} />
          {hasActiveFilters && (
            <button onClick={clearAll}
              className="text-xs text-gray-400 hover:text-white border border-blue-900 rounded-lg px-3 py-2 transition-colors">
              Clear All
            </button>
          )}
        </div>

        {selectedSkills.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-gray-500 font-medium">Active skills:</span>
            {selectedSkills.map(skill => (
              <span key={skill} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ backgroundColor: 'rgba(30,111,217,0.25)', color: '#00C6FF', border: '1px solid rgba(30,111,217,0.6)' }}>
                {skill}
                <button onClick={() => removeSkill(skill)} className="hover:text-white ml-0.5"><X size={10} /></button>
              </span>
            ))}
            {selectedSkills.length > 1 && (
              <div className="flex items-center gap-1 ml-2">
                <span className="text-xs text-gray-500">Match:</span>
                {['any','all'].map(m => (
                  <button key={m} onClick={() => setSkillMatch(m)}
                    className={`text-xs px-2.5 py-1 rounded transition-colors capitalize ${skillMatch === m ? 'bg-[#1E6FD9] text-white' : 'bg-blue-900/30 text-gray-400 hover:text-white'}`}>
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick status tabs */}
      <div className="flex gap-2 flex-wrap">
        {['', ...STATUSES].map(s => (
          <button key={s} onClick={() => set('status', s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filters.status === s ? 'border-[#1E6FD9] bg-[#1E6FD9] text-white' : 'border-blue-900 text-gray-400 hover:text-white'
            }`}>
            {s || 'All'}
          </button>
        ))}
        <button onClick={() => navigate('/hr/candidates/rejected')}
          className="text-xs px-3 py-1.5 rounded-full border border-red-900 text-red-400 hover:border-red-600 ml-auto">
          Rejected Pool →
        </button>
      </div>

      {fetchError && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-xl px-4 py-3 text-sm">{fetchError}</div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : candidates.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-sm mb-3">{hasActiveFilters ? 'No candidates match your filters.' : 'No candidates yet.'}</p>
          {hasActiveFilters && <button onClick={clearAll} className="text-sm text-[#1E6FD9] hover:underline">Clear all filters</button>}
        </div>
      ) : (
        <div className="bg-[#0A1628] border border-blue-900 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-blue-900">
              <tr className="text-xs text-gray-500">
                {canDelete && (
                  <th className="px-4 py-3 w-8">
                    <input type="checkbox" checked={allSelected}
                      onChange={toggleAll}
                      className="accent-[#1E6FD9] cursor-pointer" />
                  </th>
                )}
                <th className="text-left px-4 py-3">Candidate</th>
                <th className="text-left px-4 py-3">Profile</th>
                <th className="text-left px-4 py-3">Source</th>
                <th className="text-left px-4 py-3">Exp</th>
                <th className="text-left px-4 py-3">Exp Salary</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Priority</th>
                <th className="text-left px-4 py-3">Applied</th>
                {canDelete && <th className="px-4 py-3 w-20"></th>}
              </tr>
            </thead>
            <tbody>
              {candidates.map(c => (
                <tr key={c._id}
                  className="border-b border-blue-900/30 hover:bg-white/5 cursor-pointer"
                  onClick={() => navigate(`/hr/candidates/${c._id}`)}>
                  {canDelete && (
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.includes(c._id)}
                        onChange={() => toggleSelect(c._id)}
                        className="accent-[#1E6FD9] cursor-pointer" />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#1E6FD9] flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {c.firstName?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-white font-medium">{c.firstName} {c.lastName}</p>
                        <p className="text-xs text-gray-500">{c.phone}</p>
                        {c.previouslyApplied && (
                          <span className="text-xs bg-orange-900/40 text-orange-300 px-1.5 py-0.5 rounded">Previously Applied</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-200">{c.appliedProfile}</p>
                    <p className="text-xs text-gray-500">{c.appliedFor}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{c.leadSource}</td>
                  <td className="px-4 py-3 text-gray-300">{c.totalExperience}y</td>
                  <td className="px-4 py-3 text-gray-300">
                    {c.expectedSalary ? `₹${c.expectedSalary.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${PRIORITY_COLORS[c.priority]}`}>{c.priority}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </td>
                  {canDelete && (
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={e => openDelete(c, 'soft', e)}
                          title="Archive candidate"
                          className="p-1.5 rounded text-orange-400 hover:bg-orange-900/30 transition-colors">
                          <Trash2 size={14} />
                        </button>
                        {isSuperadmin && (
                          <button onClick={e => openDelete(c, 'hard', e)}
                            title="Delete permanently (Superadmin)"
                            className="p-1.5 rounded text-red-500 hover:bg-red-900/30 transition-colors">
                            <Trash2 size={14} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 text-sm bg-[#1A3A6B] text-white rounded-lg disabled:opacity-40">← Prev</button>
          <span className="text-sm text-gray-400">Page {page} of {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
            className="px-3 py-1.5 text-sm bg-[#1A3A6B] text-white rounded-lg disabled:opacity-40">Next →</button>
        </div>
      )}

      {/* Delete modal */}
      {deleteErr && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-900 text-red-200 text-sm px-4 py-2 rounded-lg shadow-xl z-50">
          {deleteErr}
        </div>
      )}
      <DeleteModal
        isOpen={deleteModal.open}
        onClose={() => { setDeleteModal({ open: false, type: 'soft', candidate: null }); setDeleteErr('') }}
        onConfirm={confirmSingleDelete}
        type={deleteModal.type}
        title={deleteModal.type === 'hard' ? 'Permanently Delete Candidate?' : 'Archive Candidate?'}
        message={deleteModal.type === 'hard'
          ? 'This candidate will be permanently removed from the database. This cannot be undone.'
          : 'Candidate will be moved to Archive. You can restore them from the Archive view.'}
        itemName={deleteModal.candidate ? `${deleteModal.candidate.firstName} ${deleteModal.candidate.lastName}` : ''}
        loading={deleting}
      />
    </div>
  )
}
