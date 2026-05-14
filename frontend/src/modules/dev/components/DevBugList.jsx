import { useState, useEffect, useCallback } from 'react'
import { devApi } from '../../../api/dev.api'

// ANK custom severity definitions
const SEVERITY_CONFIG = {
  blocker:  { label: 'Blocker',  color: 'bg-red-900 text-red-300 border-red-700',       tip: 'Deployment stopped, client-facing crash' },
  critical: { label: 'Critical', color: 'bg-orange-900/50 text-orange-300 border-orange-700', tip: 'Major feature completely broken' },
  major:    { label: 'Major',    color: 'bg-yellow-900/50 text-yellow-300 border-yellow-700', tip: 'Feature partly broken, workaround exists' },
  minor:    { label: 'Minor',    color: 'bg-blue-900/50 text-blue-300 border-blue-700',  tip: 'Small issue, no core workflow impact' },
  cosmetic: { label: 'Cosmetic', color: 'bg-gray-700 text-gray-300 border-gray-600',     tip: 'UI/design only, no functional impact' },
}
const STATUS_COLORS = {
  open:        'text-red-400',
  in_progress: 'text-yellow-400',
  fixed:       'text-blue-400',
  verified:    'text-green-400',
  closed:      'text-gray-400',
  wont_fix:    'text-gray-500',
  duplicate:   'text-gray-500',
}

export default function DevBugList({ projectId }) {
  const [bugs, setBugs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filters, setFilters]   = useState({ status: '', severity: '' })
  const [form, setForm]         = useState({ title: '', severity: 'major', description: '', stepsToReproduce: '', foundIn: 'staging' })
  const [saving, setSaving]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { ...filters, limit: 100 }
      Object.keys(params).forEach(k => !params[k] && delete params[k])
      const r = await devApi.listBugs(projectId, params)
      setBugs(r.data.data.bugs || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [projectId, filters])

  useEffect(() => { load() }, [load])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const createBug = async (e) => {
    e.preventDefault()
    if (!form.title || !form.severity) return
    setSaving(true)
    try {
      await devApi.createBug(projectId, form)
      setForm({ title: '', severity: 'major', description: '', stepsToReproduce: '', foundIn: 'staging' })
      setShowForm(false)
      await load()
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const updateStatus = async (bug, status) => {
    try {
      await devApi.updateBug(projectId, bug._id, { status })
      await load()
    } catch (err) { console.error(err) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Bug Tracker ({bugs.length})</h3>
        <button onClick={() => setShowForm(s => !s)}
          className="text-sm px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors">
          + Report Bug
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select value={filters.severity} onChange={e => setFilters(f => ({ ...f, severity: e.target.value }))}
          className="text-sm bg-[#1A3A6B] border border-blue-800 rounded px-2 py-1 text-white">
          <option value="">All Severity</option>
          {Object.keys(SEVERITY_CONFIG).map(s => <option key={s} value={s}>{SEVERITY_CONFIG[s].label}</option>)}
        </select>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className="text-sm bg-[#1A3A6B] border border-blue-800 rounded px-2 py-1 text-white">
          <option value="">All Status</option>
          {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {/* New Bug Form */}
      {showForm && (
        <form onSubmit={createBug} className="bg-[#1A3A6B] border border-red-800/30 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-red-300">Report a Bug</h4>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Bug title *" required
              className="col-span-2 bg-[#0A1628] border border-blue-900 rounded px-3 py-2 text-white text-sm placeholder-gray-500" />

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Severity *</label>
              <select value={form.severity} onChange={e => set('severity', e.target.value)}
                className="w-full bg-[#0A1628] border border-blue-900 rounded px-3 py-2 text-white text-sm">
                {Object.entries(SEVERITY_CONFIG).map(([k, v]) => (
                  <option key={k} value={k} title={v.tip}>{v.label} — {v.tip}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Found In</label>
              <select value={form.foundIn} onChange={e => set('foundIn', e.target.value)}
                className="w-full bg-[#0A1628] border border-blue-900 rounded px-3 py-2 text-white text-sm">
                {['staging', 'production', 'local', 'other'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="What's happening?" rows={2}
              className="col-span-2 bg-[#0A1628] border border-blue-900 rounded px-3 py-2 text-white text-sm placeholder-gray-500 resize-none" />
            <textarea value={form.stepsToReproduce} onChange={e => set('stepsToReproduce', e.target.value)}
              placeholder="Steps to reproduce..." rows={2}
              className="col-span-2 bg-[#0A1628] border border-blue-900 rounded px-3 py-2 text-white text-sm placeholder-gray-500 resize-none" />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-400 hover:text-white px-3 py-1.5">Cancel</button>
            <button type="submit" disabled={saving}
              className="text-sm px-4 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Reporting...' : 'Report Bug'}
            </button>
          </div>
        </form>
      )}

      {/* Bug list */}
      {loading ? (
        <div className="text-gray-400 text-sm text-center py-8">Loading bugs...</div>
      ) : bugs.length === 0 ? (
        <div className="text-gray-400 text-sm text-center py-8">No bugs reported for the current filters.</div>
      ) : (
        <div className="space-y-2">
          {bugs.map(bug => {
            const sev = SEVERITY_CONFIG[bug.severity] || SEVERITY_CONFIG.minor
            return (
              <div key={bug._id} className="bg-[#1A3A6B] border border-blue-900 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded border ${sev.color}`}>{sev.label}</span>
                      <span className={`text-xs font-medium ${STATUS_COLORS[bug.status]}`}>{bug.status?.replace('_', ' ')}</span>
                      <span className="text-xs text-gray-500">in {bug.foundIn}</span>
                    </div>
                    <h4 className="text-sm text-white font-medium">{bug.title}</h4>
                    {bug.description && <p className="text-xs text-gray-400 mt-0.5">{bug.description}</p>}
                    <div className="flex gap-3 mt-2 text-xs text-gray-500">
                      {bug.reportedBy && <span>Reported by {bug.reportedBy.name}</span>}
                      {bug.assignedTo && <span>→ {bug.assignedTo.name}</span>}
                      <span>{new Date(bug.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>
                  {/* Quick status update */}
                  <select
                    value={bug.status}
                    onChange={e => updateStatus(bug, e.target.value)}
                    className="text-xs bg-[#0A1628] border border-blue-900 rounded px-2 py-1 text-gray-300"
                    onClick={e => e.stopPropagation()}
                  >
                    {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
