import { useState, useEffect } from 'react'
import { devApi } from '../../../api/dev.api'
import api from '../../../api/axios'

const PROJECT_TYPES = ['website', 'web_app', 'ecommerce', 'mobile_app', 'api', 'custom']
const ECOM_PLATFORMS = ['shopify', 'woocommerce', 'magento', 'custom']

export default function DevAcceptHandoverModal({ handover, onClose, onAccepted }) {
  const [users, setUsers] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: handover.clientId?.companyName ? `${handover.clientId.companyName} — Project` : '',
    type: 'website',
    ecommercePlatform: '',
    description: handover.originalRequirement || '',
    priority: 'high',
    startDate: new Date().toISOString().slice(0, 10),
    plannedEndDate: '',
    projectManager: '',
    leadDeveloper: '',
    techStack: '',
    amcEnabled: false,
    amcDurationMonths: 12,
  })

  useEffect(() => {
    api.get('/users', { params: { limit: 200 } })
      .then(r => setUsers(r.data.data.users || []))
      .catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.type) { setError('Name and type are required'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        techStack: form.techStack.split(',').map(t => t.trim()).filter(Boolean),
        ecommercePlatform: form.type === 'ecommerce' ? form.ecommercePlatform : null,
        startDate: form.startDate || null,
        plannedEndDate: form.plannedEndDate || null,
        projectManager: form.projectManager || null,
        leadDeveloper: form.leadDeveloper || null,
      }
      const r = await devApi.acceptHandover(handover._id, payload)
      onAccepted?.(r.data.data.project._id)
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to accept handover')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0A1628] border border-green-900/50 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-blue-900">
          <div>
            <h2 className="text-lg font-bold text-white">Accept Handover</h2>
            <p className="text-sm text-gray-400">{handover.clientId?.companyName || handover.clientId?.name} — create project</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="bg-red-900/30 text-red-300 border border-red-800 rounded-lg px-4 py-2 text-sm">{error}</div>}

          {handover.originalRequirement && (
            <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-3">
              <p className="text-xs text-blue-300 font-medium mb-1">Sales Requirement</p>
              <p className="text-sm text-gray-300">{handover.originalRequirement}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Project Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} required
                className="w-full bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm" />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Type *</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm">
                {PROJECT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>

            {form.type === 'ecommerce' && (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Platform</label>
                <select value={form.ecommercePlatform} onChange={e => set('ecommercePlatform', e.target.value)}
                  className="w-full bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm">
                  <option value="">Select...</option>
                  {ECOM_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Start Date</label>
              <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)}
                className="w-full bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm" />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Planned End Date</label>
              <input type="date" value={form.plannedEndDate} onChange={e => set('plannedEndDate', e.target.value)}
                className="w-full bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm" />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Project Manager</label>
              <select value={form.projectManager} onChange={e => set('projectManager', e.target.value)}
                className="w-full bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm">
                <option value="">Unassigned</option>
                {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Lead Developer</label>
              <select value={form.leadDeveloper} onChange={e => set('leadDeveloper', e.target.value)}
                className="w-full bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm">
                <option value="">Unassigned</option>
                {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Tech Stack (comma-separated)</label>
              <input value={form.techStack} onChange={e => set('techStack', e.target.value)}
                placeholder="React, Node.js, MongoDB"
                className="w-full bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500" />
            </div>

            <div className="col-span-2 flex items-center gap-4 p-3 bg-purple-900/20 border border-purple-800/30 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.amcEnabled} onChange={e => set('amcEnabled', e.target.checked)} className="w-4 h-4" />
                <span className="text-sm text-purple-300">Enable AMC</span>
              </label>
              {form.amcEnabled && (
                <div className="flex items-center gap-2">
                  <input type="number" min="1" max="60" value={form.amcDurationMonths}
                    onChange={e => set('amcDurationMonths', +e.target.value)}
                    className="w-16 bg-[#1A3A6B] border border-blue-800 rounded px-2 py-1 text-white text-sm text-center" />
                  <span className="text-sm text-gray-400">months</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-6 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg font-medium disabled:opacity-50">
              {saving ? 'Creating Project...' : 'Accept & Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
