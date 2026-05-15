import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { ArrowLeft, Eye, Edit2, Save, FileText } from 'lucide-react'
import sopApi from '../../../api/sop.api'

const FIELD = (label, children, hint) => (
  <div>
    <label className="block text-xs text-gray-400 font-medium mb-1">{label}</label>
    {children}
    {hint && <p className="text-gray-600 text-xs mt-0.5">{hint}</p>}
  </div>
)

export default function SOPEditorPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const isEdit   = !!id

  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(isEdit)
  const [saving, setSaving]         = useState(false)
  const [preview, setPreview]       = useState(false)
  const [err, setErr]               = useState('')

  const [form, setForm] = useState({
    title: '', categoryId: '', description: '', content: '',
    applicableTo: 'all_employees', mandatory: false,
    acknowledgementDeadlineDays: 7, tags: '', changeLog: '',
  })

  useEffect(() => {
    sopApi.getCategories().then(r => setCategories(r.data.data.categories)).catch(() => {})
    if (isEdit) {
      sopApi.getSOPById(id).then(r => {
        const s = r.data.data.sop
        setForm({
          title: s.title, categoryId: s.categoryId?._id || s.categoryId || '',
          description: s.description || '', content: s.content || '',
          applicableTo: s.applicableTo, mandatory: s.mandatory,
          acknowledgementDeadlineDays: s.acknowledgementDeadlineDays,
          tags: (s.tags || []).join(', '), changeLog: '',
        })
        setLoading(false)
      }).catch(() => navigate('/sops'))
    }
  }, [id])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = async () => {
    if (!form.title.trim() || !form.categoryId) { setErr('Title and category are required'); return }
    setSaving(true); setErr('')
    try {
      const payload = {
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      }
      if (isEdit) {
        await sopApi.updateSOP(id, payload)
        navigate(`/sops/${id}`)
      } else {
        const r = await sopApi.createSOP(payload)
        navigate(`/sops/${r.data.data.sop._id}`)
      }
    } catch (e) {
      setErr(e.response?.data?.error?.message || 'Failed to save')
    }
    setSaving(false)
  }

  if (loading) return <div className="p-6 text-center text-gray-500">Loading...</div>

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(isEdit ? `/sops/${id}` : '/sops')} className="text-gray-500 hover:text-white">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-white flex-1">
          {isEdit ? 'Edit SOP' : 'New SOP'}
        </h1>
        <button
          onClick={() => setPreview(p => !p)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm border text-gray-400 hover:text-white"
          style={{ borderColor: 'rgba(255,255,255,0.1)' }}
        >
          {preview ? <Edit2 size={14} /> : <Eye size={14} />}
          {preview ? 'Edit' : 'Preview'}
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm text-white font-medium"
          style={{ backgroundColor: '#1E6FD9' }}
        >
          <Save size={14} /> {saving ? 'Saving...' : 'Save Draft'}
        </button>
      </div>

      {err && <p className="text-red-400 text-sm mb-4 px-4 py-2 rounded-xl bg-red-900/20">{err}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Meta fields */}
        <div className="space-y-4">
          {FIELD('Title *',
            <input
              value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="SOP title"
              className="w-full px-3 py-2 rounded-xl text-sm text-white border"
              style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(255,255,255,0.08)' }}
            />
          )}
          {FIELD('Category *',
            <select value={form.categoryId} onChange={e => set('categoryId', e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm text-white border"
              style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(255,255,255,0.08)' }}>
              <option value="">Select category</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          )}
          {FIELD('Description',
            <textarea
              value={form.description} onChange={e => set('description', e.target.value)}
              rows={2} placeholder="Short description"
              className="w-full px-3 py-2 rounded-xl text-sm text-white border resize-none"
              style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(255,255,255,0.08)' }}
            />
          )}
          {FIELD('Applicable To',
            <select value={form.applicableTo} onChange={e => set('applicableTo', e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm text-white border"
              style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(255,255,255,0.08)' }}>
              <option value="all_employees">All Employees</option>
              <option value="specific_departments">Specific Departments</option>
              <option value="specific_roles">Specific Roles</option>
            </select>
          )}
          {FIELD('Tags',
            <input value={form.tags} onChange={e => set('tags', e.target.value)}
              placeholder="policy, onboarding, hr"
              className="w-full px-3 py-2 rounded-xl text-sm text-white border"
              style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(255,255,255,0.08)' }}
            />, 'Comma-separated'
          )}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.mandatory} onChange={e => set('mandatory', e.target.checked)} />
            <span className="text-sm text-gray-300">Mandatory acknowledgement</span>
          </label>
          {form.mandatory && FIELD('Acknowledgement Deadline (days)',
            <input type="number" value={form.acknowledgementDeadlineDays} onChange={e => set('acknowledgementDeadlineDays', Number(e.target.value))} min={1}
              className="w-full px-3 py-2 rounded-xl text-sm text-white border"
              style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(255,255,255,0.08)' }}
            />
          )}
          {isEdit && FIELD('Change Log (for this version)',
            <input value={form.changeLog} onChange={e => set('changeLog', e.target.value)}
              placeholder="What changed in this version?"
              className="w-full px-3 py-2 rounded-xl text-sm text-white border"
              style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(255,255,255,0.08)' }}
            />
          )}
        </div>

        {/* Content editor / preview */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={14} className="text-gray-500" />
            <span className="text-xs text-gray-500">Content (Markdown supported)</span>
          </div>
          {preview ? (
            <div className="p-4 rounded-xl border min-h-[500px]" style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(255,255,255,0.08)' }}>
              {form.content ? (
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
                  {form.content}
                </ReactMarkdown>
              ) : (
                <p className="text-gray-600 italic">Nothing to preview yet.</p>
              )}
            </div>
          ) : (
            <textarea
              value={form.content}
              onChange={e => set('content', e.target.value)}
              placeholder={`# SOP Title\n\n## Purpose\nExplain the purpose of this SOP.\n\n## Scope\nWho does this apply to?\n\n## Procedure\n1. Step one\n2. Step two\n3. Step three\n\n## Responsibilities\n- HR: ...\n- Employee: ...`}
              className="w-full px-4 py-3 rounded-xl text-sm text-gray-200 border font-mono leading-relaxed resize-none"
              style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(255,255,255,0.08)', minHeight: '500px' }}
            />
          )}
          <p className="text-gray-600 text-xs mt-1">Supports Markdown: **bold**, *italic*, # headers, - lists, `code`</p>
        </div>
      </div>
    </div>
  )
}
