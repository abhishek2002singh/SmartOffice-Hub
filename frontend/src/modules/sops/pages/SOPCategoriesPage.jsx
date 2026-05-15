import { useEffect, useState } from 'react'
import { Folder, Plus, Edit2, Trash2, Download, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import sopApi from '../../../api/sop.api'

const DEFAULT_ICONS = ['FileText', 'Users', 'Target', 'MonitorCheck', 'Code2', 'DollarSign', 'Building', 'Shield', 'BookOpen']

function CategoryForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { name: '', description: '', iconName: 'FileText', sortOrder: 0 })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setErr('Name is required'); return }
    setSaving(true); setErr('')
    try { await onSave(form) }
    catch (e) { setErr(e.response?.data?.error?.message || 'Failed to save') }
    setSaving(false)
  }

  return (
    <form onSubmit={submit} className="p-4 rounded-xl border space-y-3" style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(30,111,217,0.3)' }}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Category name"
            className="w-full px-3 py-2 rounded-xl text-sm text-white border" style={{ backgroundColor: '#0A1628', borderColor: 'rgba(255,255,255,0.08)' }} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Icon</label>
          <select value={form.iconName} onChange={e => set('iconName', e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm text-white border" style={{ backgroundColor: '#0A1628', borderColor: 'rgba(255,255,255,0.08)' }}>
            {DEFAULT_ICONS.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Description</label>
        <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Short description"
          className="w-full px-3 py-2 rounded-xl text-sm text-white border" style={{ backgroundColor: '#0A1628', borderColor: 'rgba(255,255,255,0.08)' }} />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Sort Order</label>
        <input type="number" value={form.sortOrder} onChange={e => set('sortOrder', Number(e.target.value))} min={0}
          className="w-24 px-3 py-2 rounded-xl text-sm text-white border" style={{ backgroundColor: '#0A1628', borderColor: 'rgba(255,255,255,0.08)' }} />
      </div>
      {err && <p className="text-red-400 text-xs">{err}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2 rounded-xl text-gray-400 border text-sm" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>Cancel</button>
        <button type="submit" disabled={saving} className="flex-1 py-2 rounded-xl text-white text-sm font-medium" style={{ backgroundColor: '#1E6FD9' }}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  )
}

export default function SOPCategoriesPage() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [loading, setLoading]     = useState(true)
  const [showNew, setShowNew]     = useState(false)
  const [editId, setEditId]       = useState(null)
  const [seeding, setSeeding]     = useState(false)

  const fetch = async () => {
    setLoading(true)
    try { const r = await sopApi.getCategories(); setCategories(r.data.data.categories) }
    catch { /* silent */ }
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const handleSeed = async () => {
    setSeeding(true)
    try { await sopApi.seedCategories(); fetch() }
    catch (e) { alert(e.response?.data?.error?.message || 'Seed failed') }
    setSeeding(false)
  }

  const handleCreate = async (form) => {
    await sopApi.createCategory(form); setShowNew(false); fetch()
  }

  const handleUpdate = async (id, form) => {
    await sopApi.updateCategory(id, form); setEditId(null); fetch()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this category?')) return
    try { await sopApi.deleteCategory(id); fetch() }
    catch (e) { alert(e.response?.data?.error?.message || 'Delete failed') }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/sops')} className="text-gray-500 hover:text-white"><ArrowLeft size={18} /></button>
        <h1 className="text-xl font-bold text-white flex-1">SOP Categories</h1>
        <button onClick={handleSeed} disabled={seeding}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm text-gray-400 border hover:text-white"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <Download size={14} /> {seeding ? 'Seeding...' : 'Seed Defaults'}
        </button>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-white text-sm font-medium" style={{ backgroundColor: '#1E6FD9' }}>
          <Plus size={14} /> New
        </button>
      </div>

      {showNew && (
        <div className="mb-4">
          <CategoryForm onSave={handleCreate} onCancel={() => setShowNew(false)} />
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12">
          <Folder size={36} className="mx-auto text-gray-700 mb-3" />
          <p className="text-gray-500">No categories yet.</p>
          <button onClick={handleSeed} disabled={seeding} className="mt-2 text-blue-400 text-sm hover:underline">
            Seed default categories
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map(cat => (
            <div key={cat._id}>
              {editId === cat._id ? (
                <CategoryForm initial={cat} onSave={(f) => handleUpdate(cat._id, f)} onCancel={() => setEditId(null)} />
              ) : (
                <div className="flex items-center gap-4 p-4 rounded-xl border" style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(255,255,255,0.08)' }}>
                  <Folder size={20} className="text-blue-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm">{cat.name}</p>
                    <p className="text-gray-500 text-xs truncate">{cat.description}</p>
                  </div>
                  <span className="text-gray-600 text-xs">#{cat.sortOrder}</span>
                  <button onClick={() => setEditId(cat._id)} className="text-gray-500 hover:text-white p-1"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(cat._id)} className="text-gray-500 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
