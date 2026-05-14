import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { hrApi } from '../../../api/hr.api'

const PROFILES = ['Sales', 'DM', 'GD', 'Development', 'HR', 'Admin']

export default function RejectedPoolPage() {
  const navigate = useNavigate()
  const [candidates, setCandidates] = useState([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [page, setPage]             = useState(1)
  const [filters, setFilters]       = useState({ q: '', appliedProfile: '' })
  const [reactivating, setReactivating] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { status: 'Rejected', page, limit: 20, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) }
      const r = await hrApi.listCandidates(params)
      setCandidates(r.data.data.candidates || [])
      setTotal(r.data.data.total || 0)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [filters, page])

  useEffect(() => { load() }, [load])

  const reactivate = async (id) => {
    setReactivating(id)
    try {
      await hrApi.updateStatus(id, { status: 'On Hold', notes: 'Re-activated from Rejected Pool' })
      await load()
    } catch (e) { console.error(e) }
    finally { setReactivating(null) }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/hr/candidates')} className="text-xs text-gray-500 hover:text-gray-300">← All Candidates</button>
        <div>
          <h1 className="text-xl font-bold text-white">Rejected Pool</h1>
          <p className="text-gray-400 text-sm">{total} rejected candidates — searchable for future opportunities</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <input
          value={filters.q}
          onChange={e => { setFilters(f => ({ ...f, q: e.target.value })); setPage(1) }}
          placeholder="Search name, phone..."
          className="flex-1 bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500"
        />
        <select
          value={filters.appliedProfile}
          onChange={e => { setFilters(f => ({ ...f, appliedProfile: e.target.value })); setPage(1) }}
          className="bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm"
        >
          <option value="">All Profiles</option>
          {PROFILES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : candidates.length === 0 ? (
        <div className="text-center text-gray-500 py-12">No rejected candidates found.</div>
      ) : (
        <div className="bg-[#0A1628] border border-blue-900 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-blue-900">
              <tr className="text-xs text-gray-500">
                <th className="text-left px-4 py-3">Candidate</th>
                <th className="text-left px-4 py-3">Profile</th>
                <th className="text-left px-4 py-3">Experience</th>
                <th className="text-left px-4 py-3">Expected Salary</th>
                <th className="text-left px-4 py-3">Rejected On</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map(c => (
                <tr key={c._id} className="border-b border-blue-900/30 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium cursor-pointer hover:text-[#00C6FF]"
                       onClick={() => navigate(`/hr/candidates/${c._id}`)}>
                      {c.firstName} {c.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{c.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-200">{c.appliedProfile}</p>
                    <p className="text-xs text-gray-500">{c.appliedFor}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{c.totalExperience}y</td>
                  <td className="px-4 py-3 text-gray-300">
                    {c.expectedSalary ? `₹${c.expectedSalary.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(c.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => reactivate(c._id)}
                      disabled={reactivating === c._id}
                      className="text-xs px-3 py-1.5 bg-[#1A3A6B] hover:bg-blue-800 text-white rounded-lg disabled:opacity-40"
                    >
                      {reactivating === c._id ? '...' : 'Re-activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 text-sm bg-[#1A3A6B] text-white rounded-lg disabled:opacity-40">← Prev</button>
          <span className="text-sm text-gray-400">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={candidates.length < 20}
            className="px-3 py-1.5 text-sm bg-[#1A3A6B] text-white rounded-lg disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  )
}
