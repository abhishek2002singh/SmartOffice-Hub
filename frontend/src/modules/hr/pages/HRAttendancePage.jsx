import { useState, useEffect } from 'react'
import { hrApi } from '../../../api/hr.api'
import { Activity, Save, Search } from 'lucide-react'

const STATUS_OPTS = ['present', 'absent', 'half_day', 'late', 'wfh', 'holiday', 'leave', 'week_off']
const STATUS_COLOR = {
  present:  'text-green-400', late: 'text-yellow-400', half_day: 'text-yellow-300',
  absent: 'text-red-400', wfh: 'text-blue-400', holiday: 'text-purple-400',
  leave: 'text-orange-400', week_off: 'text-gray-400',
}

const inp = "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none w-full"

export default function HRAttendancePage() {
  const today = new Date().toISOString().slice(0, 10)
  const [records, setRecords] = useState([])
  const [filters, setFilters] = useState({ from: today, to: today, employeeId: '', status: '' })
  const [loading, setLoading] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [manual, setManual] = useState({ employeeId: '', date: today, status: 'present', checkIn: '', checkOut: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
      const r = await hrApi.getAttendance(params)
      setRecords(r.data.data.records)
    } catch (_) {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const saveManual = async () => {
    setSaving(true); setSaveMsg('')
    try {
      await hrApi.manualAttendance(manual)
      setSaveMsg('Attendance saved')
      setManualMode(false)
      await load()
    } catch (err) {
      setSaveMsg(err.response?.data?.error?.message || 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <div className="p-6 space-y-6" style={{ color: '#fff' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity size={22} style={{ color: '#1E6FD9' }} />
          <h1 className="text-xl font-bold">Attendance Overview</h1>
        </div>
        <button onClick={() => setManualMode(!manualMode)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: '#FF6B00', color: '#fff' }}>
          {manualMode ? 'Cancel' : 'Manual Entry'}
        </button>
      </div>

      {/* Manual Entry */}
      {manualMode && (
        <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,180,0,0.2)' }}>
          <h2 className="font-semibold text-orange-300">Manual Attendance Override</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Employee ID</label>
              <input className={inp} placeholder="Employee ObjectId" value={manual.employeeId} onChange={e => setManual(m => ({ ...m, employeeId: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Date</label>
              <input type="date" className={inp} value={manual.date} onChange={e => setManual(m => ({ ...m, date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Status</label>
              <select className={inp} value={manual.status} onChange={e => setManual(m => ({ ...m, status: e.target.value }))}>
                {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Check-in Time</label>
              <input type="time" className={inp} value={manual.checkIn} onChange={e => setManual(m => ({ ...m, checkIn: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Check-out Time</label>
              <input type="time" className={inp} value={manual.checkOut} onChange={e => setManual(m => ({ ...m, checkOut: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Notes</label>
              <input className={inp} placeholder="Reason / notes" value={manual.notes} onChange={e => setManual(m => ({ ...m, notes: e.target.value }))} />
            </div>
          </div>
          {saveMsg && <p className={`text-sm ${saveMsg.includes('saved') ? 'text-green-400' : 'text-red-400'}`}>{saveMsg}</p>}
          <button onClick={saveManual} disabled={saving || !manual.employeeId}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
            <Save size={14} />{saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">From</label>
          <input type="date" className={inp} value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">To</label>
          <input type="date" className={inp} value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Status</label>
          <select className={inp} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Status</option>
            {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium w-full justify-center"
            style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
            <Search size={14} /> Search
          </button>
        </div>
      </div>

      {/* Records table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading…</div>
        ) : records.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No records found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                {['Employee', 'Date', 'Status', 'Check-In', 'Check-Out', 'Hours', 'Notes'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-semibold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => {
                const emp = r.employeeId
                return (
                  <tr key={r._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td className="px-4 py-3">
                      {emp ? <div><p className="text-white text-xs font-medium">{emp.firstName} {emp.lastName}</p><p className="text-gray-500 text-xs font-mono">{emp.employeeCode}</p></div> : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs">{new Date(r.date).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${STATUS_COLOR[r.status] || 'text-gray-300'}`}>{r.status}</span>
                      {r.isWFH && <span className="ml-1 text-xs text-blue-400">(WFH)</span>}
                      {r.modifiedBy && <span className="ml-1 text-[10px] text-orange-400">edited</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs font-mono">{r.checkIn ? new Date(r.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td className="px-4 py-3 text-gray-300 text-xs font-mono">{r.checkOut ? new Date(r.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td className="px-4 py-3 text-gray-300 text-xs">{r.workHours ? `${r.workHours}h` : '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-32 truncate">{r.notes || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
