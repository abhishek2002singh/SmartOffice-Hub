import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { hrApi } from '../../../api/hr.api'
import api from '../../../api/axios'
import { X } from 'lucide-react'

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
  const [candidates, setCandidates] = useState([])
  const [total, setTotal]           = useState(0)
  const [pages, setPages]           = useState(1)
  const [loading, setLoading]       = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [page, setPage]             = useState(1)

  // All available skills from departments (for the filter dropdown)
  const [availableSkills, setAvailableSkills] = useState([])
  const [selectedSkills, setSelectedSkills]   = useState([]) // array of skill name strings
  const [skillInput, setSkillInput]           = useState('')
  const [showSkillDropdown, setShowSkillDropdown] = useState(false)

  const [filters, setFilters] = useState({
    q: '', status: '', appliedProfile: '', appliedFor: '',
    leadSource: '', gender: '', minExp: '', maxExp: '',
    minSalary: '', maxSalary: '',
  })

  // Load all skills from departments for the filter
  useEffect(() => {
    api.get('/departments').then(r => {
      const depts = r.data?.data?.departments || []
      const skills = []
      depts.forEach(d => (d.skills || []).forEach(s => {
        if (!skills.includes(s.name)) skills.push(s.name)
      }))
      setAvailableSkills(skills.sort())
    }).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    try {
      const params = {
        page, limit: 20,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')),
      }
      if (selectedSkills.length) params.skills = selectedSkills
      const r = await hrApi.listCandidates(params)
      setCandidates(r.data.data.candidates || [])
      setTotal(r.data.data.total || 0)
      setPages(r.data.data.pages || 1)
    } catch (e) {
      setFetchError(e.response?.data?.error?.message || e.message || 'Failed to load candidates')
    }
    finally { setLoading(false) }
  }, [filters, page, selectedSkills])

  useEffect(() => { load() }, [load])

  const set = (k, v) => { setFilters(f => ({ ...f, [k]: v })); setPage(1) }

  const addSkill = (skill) => {
    if (!selectedSkills.includes(skill)) {
      setSelectedSkills(s => [...s, skill])
      setPage(1)
    }
    setSkillInput('')
    setShowSkillDropdown(false)
  }

  const removeSkill = (skill) => {
    setSelectedSkills(s => s.filter(x => x !== skill))
    setPage(1)
  }

  const clearAll = () => {
    setFilters({ q:'',status:'',appliedProfile:'',appliedFor:'',leadSource:'',gender:'',minExp:'',maxExp:'',minSalary:'',maxSalary:'' })
    setSelectedSkills([])
    setPage(1)
  }

  const filteredSkillOptions = availableSkills.filter(s =>
    s.toLowerCase().includes(skillInput.toLowerCase()) && !selectedSkills.includes(s)
  )

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Candidates</h1>
          <p className="text-gray-400 text-sm mt-1">{total} total candidates</p>
        </div>
        <div className="flex gap-3">
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

      {/* Filters */}
      <div className="bg-[#0A1628] border border-blue-900 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <input
            value={filters.q}
            onChange={e => set('q', e.target.value)}
            placeholder="Search name, phone, company..."
            className="col-span-2 bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500"
          />
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
          <input
            type="number" value={filters.minExp} onChange={e => set('minExp', e.target.value)}
            placeholder="Min Exp (yrs)"
            className="bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500"
          />
          <input
            type="number" value={filters.maxExp} onChange={e => set('maxExp', e.target.value)}
            placeholder="Max Exp (yrs)"
            className="bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500"
          />
          <input
            type="number" value={filters.minSalary} onChange={e => set('minSalary', e.target.value)}
            placeholder="Min Salary (₹)"
            className="bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500"
          />
          <input
            type="number" value={filters.maxSalary} onChange={e => set('maxSalary', e.target.value)}
            placeholder="Max Salary (₹)"
            className="bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500"
          />
          <button onClick={clearAll}
            className="text-xs text-gray-400 hover:text-white border border-blue-900 rounded-lg px-3 py-2">
            Clear All
          </button>
        </div>

        {/* Skill multi-select filter */}
        <div className="relative">
          <p className="text-xs text-gray-500 mb-1.5">Filter by Skills (multi-select)</p>
          <div className="flex flex-wrap gap-1.5 items-center min-h-[36px] bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-1.5">
            {selectedSkills.map(s => (
              <span key={s} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(30,111,217,0.4)', color: '#fff' }}>
                {s}
                <button onClick={() => removeSkill(s)} className="text-gray-300 hover:text-white">
                  <X size={10} />
                </button>
              </span>
            ))}
            <input
              value={skillInput}
              onChange={e => { setSkillInput(e.target.value); setShowSkillDropdown(true) }}
              onFocus={() => setShowSkillDropdown(true)}
              onBlur={() => setTimeout(() => setShowSkillDropdown(false), 150)}
              placeholder={selectedSkills.length ? '' : 'Type to search skills...'}
              className="flex-1 min-w-[120px] bg-transparent text-white text-sm placeholder-gray-500 outline-none"
            />
          </div>
          {showSkillDropdown && filteredSkillOptions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-lg shadow-lg overflow-y-auto max-h-40"
              style={{ backgroundColor: '#1A3A6B', border: '1px solid rgba(30,111,217,0.5)' }}>
              {filteredSkillOptions.map(s => (
                <button key={s} onMouseDown={() => addSkill(s)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-white/10 hover:text-white">
                  {s}
                </button>
              ))}
            </div>
          )}
          {showSkillDropdown && skillInput && filteredSkillOptions.length === 0 && (
            <div className="absolute top-full left-0 z-20 mt-1 rounded-lg px-3 py-2 text-xs text-gray-500"
              style={{ backgroundColor: '#1A3A6B', border: '1px solid rgba(30,111,217,0.3)' }}>
              No matching skills found
            </div>
          )}
        </div>
      </div>

      {/* Quick status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['', ...STATUSES].map(s => (
          <button key={s} onClick={() => set('status', s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filters.status === s
                ? 'border-[#1E6FD9] bg-[#1E6FD9] text-white'
                : 'border-blue-900 text-gray-400 hover:text-white'
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
        <div className="text-center text-gray-500 py-12">No candidates found.</div>
      ) : (
        <div className="bg-[#0A1628] border border-blue-900 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-blue-900">
              <tr className="text-xs text-gray-500">
                <th className="text-left px-4 py-3">Candidate</th>
                <th className="text-left px-4 py-3">Profile</th>
                <th className="text-left px-4 py-3">Source</th>
                <th className="text-left px-4 py-3">Exp</th>
                <th className="text-left px-4 py-3">Exp Salary</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Priority</th>
                <th className="text-left px-4 py-3">Applied</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map(c => (
                <tr
                  key={c._id}
                  className="border-b border-blue-900/30 hover:bg-white/5 cursor-pointer"
                  onClick={() => navigate(`/hr/candidates/${c._id}`)}
                >
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
    </div>
  )
}
