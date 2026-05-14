import { useState, useEffect } from 'react'
import { hrApi } from '../../../api/hr.api'
import { DollarSign, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Check, X } from 'lucide-react'

const inp = "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none w-full"
const EMPTY_STRUCT = { name: '', basicPercent: 40, hraPercent: 20, allowances: [], deductions: [] }
const EMPTY_ALLOW  = { name: '', value: 10, isPercent: true, taxable: true }
const EMPTY_DED    = { name: '', value: 12, isPercent: true, type: 'other' }

const DED_TYPES = ['pf', 'esi', 'tds', 'professional_tax', 'loan', 'other']

function ItemList({ items, onChange, type }) {
  const empty = type === 'allowance' ? EMPTY_ALLOW : EMPTY_DED
  const add  = () => onChange([...items, { ...empty }])
  const del  = (i) => onChange(items.filter((_, idx) => idx !== i))
  const set  = (i, k, v) => onChange(items.map((it, idx) => idx === i ? { ...it, [k]: v } : it))

  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input className={inp + ' flex-1'} placeholder="Name" value={it.name} onChange={e => set(i, 'name', e.target.value)} />
          <input type="number" className={inp + ' w-24'} placeholder="Value" value={it.value} onChange={e => set(i, 'value', +e.target.value)} min={0} />
          <label className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap cursor-pointer">
            <input type="checkbox" checked={it.isPercent} onChange={e => set(i, 'isPercent', e.target.checked)} className="accent-blue-500" />
            %
          </label>
          {type === 'allowance' && (
            <label className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap cursor-pointer">
              <input type="checkbox" checked={it.taxable} onChange={e => set(i, 'taxable', e.target.checked)} className="accent-blue-500" />
              Taxable
            </label>
          )}
          {type === 'deduction' && (
            <select className={inp + ' w-36'} value={it.type} onChange={e => set(i, 'type', e.target.value)}>
              {DED_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          )}
          <button onClick={() => del(i)} className="text-red-400 hover:text-red-300 p-1 shrink-0"><Trash2 size={13} /></button>
        </div>
      ))}
      <button onClick={add} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
        <Plus size={12} /> Add {type === 'allowance' ? 'Allowance' : 'Deduction'}
      </button>
    </div>
  )
}

function StructureForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY_STRUCT)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.name) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="rounded-xl p-5 space-y-4 mb-4" style={{ backgroundColor: 'rgba(30,111,217,0.08)', border: '1px solid rgba(30,111,217,0.3)' }}>
      <h3 className="font-semibold text-white">{initial ? 'Edit Structure' : 'New Salary Structure'}</h3>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Structure Name</label>
          <input className={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Standard" />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Basic (% of CTC)</label>
          <input type="number" className={inp} value={form.basicPercent} onChange={e => set('basicPercent', +e.target.value)} min={0} max={100} />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">HRA (% of Basic)</label>
          <input type="number" className={inp} value={form.hraPercent} onChange={e => set('hraPercent', +e.target.value)} min={0} max={100} />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">Allowances</label>
        <ItemList items={form.allowances} onChange={v => set('allowances', v)} type="allowance" />
      </div>
      <div>
        <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">Deductions</label>
        <ItemList items={form.deductions} onChange={v => set('deductions', v)} type="deduction" />
      </div>
      <div className="flex gap-3">
        <button onClick={submit} disabled={saving || !form.name}
          className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: '#10B981', color: '#fff' }}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-gray-300">Cancel</button>
      </div>
    </div>
  )
}

function StructureCard({ s, onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="font-semibold text-white">{s.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">Basic: {s.basicPercent}% of CTC · HRA: {s.hraPercent}% of Basic</p>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={() => setOpen(o => !o)} className="text-gray-400 hover:text-white p-1">
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button onClick={() => onEdit(s)} className="p-1 text-gray-400 hover:text-white"><Pencil size={13} /></button>
          <button onClick={() => onDelete(s._id)} className="p-1 text-gray-400 hover:text-red-400"><Trash2 size={13} /></button>
        </div>
      </div>
      {open && (
        <div className="px-5 pb-4 grid grid-cols-2 gap-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 mt-3">Allowances</p>
            {s.allowances.length === 0 ? <p className="text-xs text-gray-600">None</p> : s.allowances.map((a, i) => (
              <div key={i} className="flex justify-between text-xs text-gray-300 mb-1">
                <span>{a.name} {a.isPercent ? `(${a.value}% of basic)` : `(₹${a.value})`}</span>
                {a.taxable ? <Check size={10} className="text-green-400" /> : <X size={10} className="text-gray-600" />}
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 mt-3">Deductions</p>
            {s.deductions.length === 0 ? <p className="text-xs text-gray-600">None</p> : s.deductions.map((d, i) => (
              <div key={i} className="flex justify-between text-xs text-gray-300 mb-1">
                <span>{d.name} {d.isPercent ? `(${d.value}%)` : `(₹${d.value})`}</span>
                <span className="text-gray-500">{d.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function SalaryStructurePage() {
  const [structures, setStructures] = useState([])
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = async () => {
    try { const r = await hrApi.listSalaryStructures(); setStructures(r.data.data.structures) } catch (_) {}
  }
  useEffect(() => { load() }, [])

  const handleCreate = async (form) => {
    try { await hrApi.createSalaryStructure(form); setAdding(false); await load() } catch (_) {}
  }
  const handleUpdate = async (form) => {
    try { await hrApi.updateSalaryStructure(editing._id, form); setEditing(null); await load() } catch (_) {}
  }
  const handleDelete = async (id) => {
    if (!confirm('Deactivate this salary structure?')) return
    await hrApi.deleteSalaryStructure(id)
    await load()
  }

  return (
    <div className="p-6 space-y-6" style={{ color: '#fff' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign size={22} style={{ color: '#1E6FD9' }} />
          <h1 className="text-xl font-bold">Salary Structures</h1>
        </div>
        <button onClick={() => { setAdding(true); setEditing(null) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
          <Plus size={14} /> Add Structure
        </button>
      </div>

      {adding  && <StructureForm onSave={handleCreate} onCancel={() => setAdding(false)} />}
      {editing && <StructureForm initial={editing} onSave={handleUpdate} onCancel={() => setEditing(null)} />}

      <div className="space-y-3">
        {structures.map(s => (
          <StructureCard key={s._id} s={s} onEdit={setEditing} onDelete={handleDelete} />
        ))}
        {structures.length === 0 && (
          <div className="rounded-xl p-10 text-center text-gray-400" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
            No salary structures configured
          </div>
        )}
      </div>
    </div>
  )
}
