import { useState, useEffect } from 'react'
import { devApi } from '../../../api/dev.api'
import api from '../../../api/axios'

const PROJECT_TYPES = ['website', 'web_app', 'ecommerce', 'mobile_app', 'api', 'custom']
const ECOM_PLATFORMS = ['shopify', 'woocommerce', 'magento', 'custom']
const PRIORITIES = ['high', 'medium', 'low']

export default function DevCreateProjectModal({ onClose, onCreated, prefill = {} }) {
  const [clients, setClients]   = useState([])
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [form, setForm]         = useState({
    clientId: prefill.clientId || '',
    name: prefill.name || '',
    type: prefill.type || 'website',
    ecommercePlatform: '',
    description: prefill.description || '',
    priority: 'medium',
    startDate: '',
    plannedEndDate: '',
    projectManager: '',
    leadDeveloper: '',
    teamMembers: [],
    techStack: '',
    codeRepoUrl: '',
    stagingUrl: '',
    productionUrl: '',
    amcEnabled: false,
    amcDurationMonths: 12,
  })

  useEffect(() => {
    Promise.all([
      api.get('/crm/clients', { params: { limit: 200 } }),
      api.get('/users', { params: { limit: 200 } }),
    ]).then(([cr, ur]) => {
      setClients(cr.data.data.clients || [])
      setUsers(ur.data.data.users || [])
    }).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.clientId || !form.name || !form.type) {
      setError('Client, name, and type are required')
      return
    }
    setLoading(true)
    try {
      const payload = {
        ...form,
        techStack: form.techStack.split(',').map(t => t.trim()).filter(Boolean),
        ecommercePlatform: form.type === 'ecommerce' ? form.ecommercePlatform : null,
        startDate: form.startDate || null,
        plannedEndDate: form.plannedEndDate || null,
        projectManager: form.projectManager || null,
        leadDeveloper: form.leadDeveloper || null,
        codeRepoUrl: form.codeRepoUrl || null,
        stagingUrl: form.stagingUrl || null,
        productionUrl: form.productionUrl || null,
      }
      await devApi.createProject(payload)
      onCreated?.()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0A1628] border border-blue-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-blue-900">
          <h2 className="text-xl font-bold text-white">New Development Project</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-900/30 text-red-300 border border-red-800 rounded-lg px-4 py-2 text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Client *</label>
              <select value={form.clientId} onChange={e => set('clientId', e.target.value)}
                className="w-full bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm">
                <option value="">Select client...</option>
                {clients.map(c => <option key={c._id} value={c._id}>{c.companyName || c.name}</option>)}
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Project Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. ANK Corp Website Redesign"
                className="w-full bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500" />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Project Type *</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm">
                {PROJECT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>

            {form.type === 'ecommerce' && (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">E-commerce Platform</label>
                <select value={form.ecommercePlatform} onChange={e => set('ecommercePlatform', e.target.value)}
                  className="w-full bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm">
                  <option value="">Select platform...</option>
                  {ECOM_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)}
                className="w-full bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm">
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

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
                placeholder="React, Node.js, MongoDB, AWS"
                className="w-full bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500" />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Code Repo URL (optional)</label>
              <input value={form.codeRepoUrl} onChange={e => set('codeRepoUrl', e.target.value)}
                placeholder="https://github.com/ank/project"
                className="w-full bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500" />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Staging URL (optional)</label>
              <input value={form.stagingUrl} onChange={e => set('stagingUrl', e.target.value)}
                placeholder="https://staging.client.com"
                className="w-full bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500" />
            </div>

            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                rows={3} placeholder="Project scope, objectives..."
                className="w-full bg-[#1A3A6B] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 resize-none" />
            </div>

            {/* AMC */}
            <div className="col-span-2 flex items-center gap-4 p-3 bg-purple-900/20 border border-purple-800/30 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.amcEnabled} onChange={e => set('amcEnabled', e.target.checked)}
                  className="w-4 h-4 rounded" />
                <span className="text-sm text-purple-300">Enable AMC after project completion</span>
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
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={loading}
              className="px-6 py-2 bg-[#1E6FD9] hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
