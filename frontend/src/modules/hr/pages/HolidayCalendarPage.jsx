import { useState, useEffect } from 'react'
import { hrApi } from '../../../api/hr.api'
import { CalendarDays, Plus, Trash2 } from 'lucide-react'

const TYPE_COLOR = {
  national: 'bg-red-500/20 text-red-300',
  regional: 'bg-blue-500/20 text-blue-300',
  optional: 'bg-gray-500/20 text-gray-300',
}

const inp = "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none w-full"

export default function HolidayCalendarPage() {
  const [holidays, setHolidays] = useState([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ date: '', name: '', type: 'national', applicableTo: 'all' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = async () => {
    try { const r = await hrApi.listHolidays({ year }); setHolidays(r.data.data.holidays) } catch (_) {}
  }

  useEffect(() => { load() }, [year])

  const save = async () => {
    if (!form.date || !form.name) { setMsg('Date and name required'); return }
    setSaving(true); setMsg('')
    try {
      await hrApi.createHoliday(form)
      setAdding(false)
      setForm({ date: '', name: '', type: 'national', applicableTo: 'all' })
      await load()
    } catch (err) {
      setMsg(err.response?.data?.error?.message || 'Failed to add holiday')
    } finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Remove this holiday?')) return
    await hrApi.deleteHoliday(id)
    setHolidays(h => h.filter(x => x._id !== id))
  }

  const grouped = holidays.reduce((acc, h) => {
    const m = new Date(h.date).toLocaleString('en-IN', { month: 'long' })
    if (!acc[m]) acc[m] = []
    acc[m].push(h)
    return acc
  }, {})

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto" style={{ color: '#fff' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays size={22} style={{ color: '#1E6FD9' }} />
          <h1 className="text-xl font-bold">Holiday Calendar</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 items-center bg-white/5 rounded-lg px-3 py-1.5">
            <button onClick={() => setYear(y => y - 1)} className="text-gray-400 hover:text-white px-1">←</button>
            <span className="text-sm font-semibold text-white px-2">{year}</span>
            <button onClick={() => setYear(y => y + 1)} className="text-gray-400 hover:text-white px-1">→</button>
          </div>
          <button onClick={() => setAdding(!adding)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
            <Plus size={14} /> Add Holiday
          </button>
        </div>
      </div>

      {adding && (
        <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 className="font-semibold text-white">Add Holiday</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Date</label>
              <input type="date" className={inp} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Name</label>
              <input className={inp} placeholder="e.g. Diwali" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Type</label>
              <select className={inp} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="national">National</option>
                <option value="regional">Regional</option>
                <option value="optional">Optional</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Applicable To</label>
              <select className={inp} value={form.applicableTo} onChange={e => setForm(f => ({ ...f, applicableTo: e.target.value }))}>
                <option value="all">All</option>
                <option value="delhi">Delhi</option>
                <option value="remote">Remote</option>
              </select>
            </div>
          </div>
          {msg && <p className="text-sm text-red-400">{msg}</p>}
          <div className="flex gap-3">
            <button onClick={save} disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: '#10B981', color: '#fff' }}>
              {saving ? 'Saving…' : 'Save Holiday'}
            </button>
            <button onClick={() => setAdding(false)} className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-gray-300">Cancel</button>
          </div>
        </div>
      )}

      {/* Holiday list grouped by month */}
      {Object.keys(grouped).length === 0 ? (
        <div className="rounded-xl p-10 text-center text-gray-400" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
          No holidays for {year}
        </div>
      ) : (
        Object.entries(grouped).map(([month, hs]) => (
          <div key={month} className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <h3 className="text-sm font-semibold text-white">{month}</h3>
            </div>
            <div className="divide-y" style={{}}>
              {hs.map(h => (
                <div key={h._id} className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center gap-3">
                    <div className="text-center w-10">
                      <p className="text-lg font-bold text-white">{new Date(h.date).getDate()}</p>
                      <p className="text-[10px] text-gray-500">{new Date(h.date).toLocaleString('en-IN', { weekday: 'short' })}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{h.name}</p>
                      <div className="flex gap-2 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TYPE_COLOR[h.type]}`}>{h.type}</span>
                        {h.applicableTo !== 'all' && <span className="text-[10px] text-gray-500">{h.applicableTo} only</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => remove(h._id)} className="p-1 text-gray-500 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
