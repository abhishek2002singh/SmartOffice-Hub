import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, ArrowLeft, ClipboardList, ChevronDown, ChevronUp, Users, BookOpen, FileText, Monitor, Calendar } from 'lucide-react'
import onboardingApi from '../../../api/onboarding.api'

const TYPE_LABELS = { read_sop: 'Read SOP', complete_task: 'Complete Task', submit_document: 'Submit Document', attend_meeting: 'Attend Meeting', online_form: 'Online Form' }
const ROLE_LABELS = { HR: 'HR', Manager: 'Manager', IT: 'IT', Self: 'Self' }

const EMPTY_ITEM = { title: '', description: '', type: 'complete_task', daysFromJoining: 1, mandatory: true, assignedRole: 'Self', sortOrder: 0 }

function ItemRow({ item, idx, onChange, onRemove }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-start py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="col-span-4">
        <input value={item.title} onChange={e => onChange(idx, 'title', e.target.value)} placeholder="Item title"
          className="w-full px-2 py-1.5 rounded-lg text-xs text-white border" style={{ backgroundColor: '#0A1628', borderColor: 'rgba(255,255,255,0.08)' }} />
      </div>
      <div className="col-span-3">
        <select value={item.type} onChange={e => onChange(idx, 'type', e.target.value)}
          className="w-full px-2 py-1.5 rounded-lg text-xs text-white border" style={{ backgroundColor: '#0A1628', borderColor: 'rgba(255,255,255,0.08)' }}>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="col-span-2">
        <select value={item.assignedRole} onChange={e => onChange(idx, 'assignedRole', e.target.value)}
          className="w-full px-2 py-1.5 rounded-lg text-xs text-white border" style={{ backgroundColor: '#0A1628', borderColor: 'rgba(255,255,255,0.08)' }}>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="col-span-1">
        <input type="number" value={item.daysFromJoining} min={1} onChange={e => onChange(idx, 'daysFromJoining', Number(e.target.value))}
          className="w-full px-2 py-1.5 rounded-lg text-xs text-white border text-center" style={{ backgroundColor: '#0A1628', borderColor: 'rgba(255,255,255,0.08)' }} />
      </div>
      <div className="col-span-1 flex justify-center pt-1.5">
        <input type="checkbox" checked={item.mandatory} onChange={e => onChange(idx, 'mandatory', e.target.checked)} />
      </div>
      <div className="col-span-1 flex justify-center">
        <button onClick={() => onRemove(idx)} className="text-gray-600 hover:text-red-400 pt-1.5 text-xs">✕</button>
      </div>
    </div>
  )
}

function TemplateForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { name: '', description: '', applicableTo: 'all', isDefault: false, items: [] })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const updateItem = (idx, key, val) => setForm(f => {
    const items = [...f.items]; items[idx] = { ...items[idx], [key]: val }; return { ...f, items }
  })
  const addItem  = () => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM, sortOrder: f.items.length }] }))
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setErr('Name is required'); return }
    setSaving(true); setErr('')
    try { await onSave(form) }
    catch (e) { setErr(e.response?.data?.error?.message || 'Failed to save') }
    setSaving(false)
  }

  return (
    <form onSubmit={submit} className="p-5 rounded-xl border space-y-4" style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(30,111,217,0.3)' }}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Template Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. New Joiner - Day 1"
            className="w-full px-3 py-2 rounded-xl text-sm text-white border" style={{ backgroundColor: '#0A1628', borderColor: 'rgba(255,255,255,0.08)' }} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Applicable To</label>
          <select value={form.applicableTo} onChange={e => set('applicableTo', e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm text-white border" style={{ backgroundColor: '#0A1628', borderColor: 'rgba(255,255,255,0.08)' }}>
            <option value="all">All Employees</option>
            <option value="department">Specific Department</option>
            <option value="role">Specific Role</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Description</label>
        <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Short description"
          className="w-full px-3 py-2 rounded-xl text-sm text-white border" style={{ backgroundColor: '#0A1628', borderColor: 'rgba(255,255,255,0.08)' }} />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.isDefault} onChange={e => set('isDefault', e.target.checked)} />
        <span className="text-sm text-gray-300">Set as default (auto-assigned to new joiners)</span>
      </label>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Checklist Items</p>
          <button type="button" onClick={addItem} className="text-xs text-blue-400 hover:underline flex items-center gap-1"><Plus size={12} /> Add Item</button>
        </div>
        {form.items.length > 0 && (
          <div className="mb-2 grid grid-cols-12 gap-2 text-xs text-gray-600 px-0.5">
            <div className="col-span-4">Title</div>
            <div className="col-span-3">Type</div>
            <div className="col-span-2">Assigned To</div>
            <div className="col-span-1 text-center">Day</div>
            <div className="col-span-1 text-center">Req</div>
            <div className="col-span-1" />
          </div>
        )}
        {form.items.map((item, idx) => (
          <ItemRow key={idx} item={item} idx={idx} onChange={updateItem} onRemove={removeItem} />
        ))}
        {form.items.length === 0 && (
          <p className="text-gray-700 text-xs text-center py-4">No items yet. Click "Add Item" above.</p>
        )}
      </div>

      {err && <p className="text-red-400 text-xs">{err}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="flex-1 py-2 rounded-xl text-gray-400 border text-sm" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>Cancel</button>
        <button type="submit" disabled={saving} className="flex-1 py-2 rounded-xl text-white text-sm font-medium" style={{ backgroundColor: '#1E6FD9' }}>
          {saving ? 'Saving...' : 'Save Template'}
        </button>
      </div>
    </form>
  )
}

export default function OnboardingTemplatesPage() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading]     = useState(true)
  const [showNew, setShowNew]     = useState(false)
  const [editId, setEditId]       = useState(null)
  const [expanded, setExpanded]   = useState({})

  const fetch = async () => {
    setLoading(true)
    try { const r = await onboardingApi.listTemplates(); setTemplates(r.data.data.templates) }
    catch { /* silent */ }
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const handleCreate = async (form) => { await onboardingApi.createTemplate(form); setShowNew(false); fetch() }
  const handleUpdate = async (id, form) => { await onboardingApi.updateTemplate(id, form); setEditId(null); fetch() }
  const handleDelete = async (id) => {
    if (!confirm('Delete this template?')) return
    try { await onboardingApi.deleteTemplate(id); fetch() }
    catch (e) { alert(e.response?.data?.error?.message || 'Delete failed') }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/hr/employees')} className="text-gray-500 hover:text-white"><ArrowLeft size={18} /></button>
        <h1 className="text-xl font-bold text-white flex-1">Onboarding Templates</h1>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-white text-sm font-medium" style={{ backgroundColor: '#1E6FD9' }}>
          <Plus size={14} /> New Template
        </button>
      </div>

      {showNew && <div className="mb-6"><TemplateForm onSave={handleCreate} onCancel={() => setShowNew(false)} /></div>}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList size={40} className="mx-auto text-gray-700 mb-3" />
          <p className="text-gray-500">No onboarding templates yet</p>
          <button onClick={() => setShowNew(true)} className="mt-2 text-blue-400 text-sm hover:underline">Create your first template</button>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map(tmpl => (
            <div key={tmpl._id}>
              {editId === tmpl._id ? (
                <TemplateForm initial={tmpl} onSave={(f) => handleUpdate(tmpl._id, f)} onCancel={() => setEditId(null)} />
              ) : (
                <div className="rounded-xl border" style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center gap-4 p-4">
                    <ClipboardList size={18} className="text-blue-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium">{tmpl.name}</p>
                        {tmpl.isDefault && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-300">Default</span>}
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5">{tmpl.items.length} items · {tmpl.applicableTo.replace('_', ' ')}</p>
                    </div>
                    <button onClick={() => setExpanded(e => ({ ...e, [tmpl._id]: !e[tmpl._id] }))} className="text-gray-500 hover:text-white p-1">
                      {expanded[tmpl._id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button onClick={() => setEditId(tmpl._id)} className="text-gray-500 hover:text-white p-1"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(tmpl._id)} className="text-gray-500 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                  </div>
                  {expanded[tmpl._id] && tmpl.items.length > 0 && (
                    <div className="border-t px-4 pb-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      {tmpl.items.sort((a, b) => a.sortOrder - b.sortOrder).map((item, i) => (
                        <div key={i} className="flex items-center gap-3 py-2 text-xs text-gray-400 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                          <span className="text-gray-700 w-4 text-right">{i + 1}</span>
                          <span className="flex-1 text-gray-300">{item.title}</span>
                          <span className="text-gray-600">{TYPE_LABELS[item.type]}</span>
                          <span className="text-gray-600">Day {item.daysFromJoining}</span>
                          <span className="text-gray-600">{item.assignedRole}</span>
                          {item.mandatory && <span className="text-orange-400">*</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
