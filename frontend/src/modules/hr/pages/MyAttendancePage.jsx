import { useState, useEffect } from 'react'
import { hrApi } from '../../../api/hr.api'
import { Clock, LogIn, LogOut, Wifi, WifiOff, CalendarDays } from 'lucide-react'

const STATUS_COLOR = {
  present:  { bg: '#10B98120', text: '#10B981', label: 'Present' },
  late:     { bg: '#F59E0B20', text: '#F59E0B', label: 'Late' },
  half_day: { bg: '#F59E0B20', text: '#F59E0B', label: 'Half Day' },
  absent:   { bg: '#EF444420', text: '#EF4444', label: 'Absent' },
  wfh:      { bg: '#00C6FF20', text: '#00C6FF', label: 'WFH' },
  holiday:  { bg: '#8B5CF620', text: '#8B5CF6', label: 'Holiday' },
  leave:    { bg: '#FF6B0020', text: '#FF6B00', label: 'Leave' },
  week_off: { bg: '#6B728020', text: '#6B7280', label: 'Week Off' },
}

function pad(n) { return String(n).padStart(2, '0') }

function LiveClock() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i) }, [])
  return <span className="font-mono">{pad(t.getHours())}:{pad(t.getMinutes())}:{pad(t.getSeconds())}</span>
}

function buildCalendarGrid(year, month, records) {
  const map = {}
  records.forEach(r => { map[r.date.slice(0, 10)] = r })

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []

  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${pad(month + 1)}-${pad(d)}`
    cells.push({ day: d, iso, record: map[iso] })
  }
  return cells
}

export default function MyAttendancePage() {
  const now   = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [records, setRecords] = useState([])
  const [today, setToday]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState('')
  const [isWFH, setIsWFH]     = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const from = `${year}-${pad(month + 1)}-01`
      const to   = `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`
      const r = await hrApi.getMyAttendance({ from, to })
      setRecords(r.data.data.records)
      setToday(r.data.data.todayRecord)
    } catch (_) {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [year, month])

  const doCheckIn = async () => {
    setActionMsg('')
    try {
      await hrApi.checkIn({ isWFH })
      setActionMsg('Checked in successfully!')
      await load()
    } catch (err) {
      setActionMsg(err.response?.data?.error?.message || 'Check-in failed')
    }
  }

  const doCheckOut = async () => {
    setActionMsg('')
    try {
      await hrApi.checkOut({})
      setActionMsg('Checked out successfully!')
      await load()
    } catch (err) {
      setActionMsg(err.response?.data?.error?.message || 'Check-out failed')
    }
  }

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  const cells = buildCalendarGrid(year, month, records)
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

  const hasCheckedIn  = !!today?.checkIn
  const hasCheckedOut = !!today?.checkOut

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto" style={{ color: '#fff' }}>
      <div className="flex items-center gap-3">
        <CalendarDays size={22} style={{ color: '#1E6FD9' }} />
        <h1 className="text-xl font-bold">My Attendance</h1>
      </div>

      {/* Check-in widget */}
      <div className="rounded-2xl p-6" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-gray-400 text-sm">Today — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <p className="text-3xl font-bold mt-1"><LiveClock /></p>
            {today && (
              <div className="flex gap-4 mt-2 text-sm text-gray-300">
                {today.checkIn  && <span>In: <b>{new Date(today.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</b></span>}
                {today.checkOut && <span>Out: <b>{new Date(today.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</b></span>}
                {today.workHours && <span>Hours: <b>{today.workHours}h</b></span>}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {today?.status && (
              <span className="px-3 py-1 rounded text-sm font-medium" style={{ backgroundColor: STATUS_COLOR[today.status]?.bg, color: STATUS_COLOR[today.status]?.text }}>
                {STATUS_COLOR[today.status]?.label || today.status}
              </span>
            )}
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              {isWFH ? <Wifi size={14} style={{ color: '#00C6FF' }} /> : <WifiOff size={14} className="text-gray-500" />}
              <input type="checkbox" checked={isWFH} onChange={e => setIsWFH(e.target.checked)} className="accent-blue-500" />
              WFH
            </label>
            <button
              disabled={hasCheckedIn && hasCheckedOut}
              onClick={hasCheckedIn ? doCheckOut : doCheckIn}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
              style={{ backgroundColor: hasCheckedIn ? '#EF4444' : '#10B981', color: '#fff' }}
            >
              {hasCheckedIn ? <><LogOut size={16} /> Check Out</> : <><LogIn size={16} /> Check In</>}
            </button>
          </div>
        </div>
        {actionMsg && <p className={`mt-3 text-sm ${actionMsg.includes('success') ? 'text-green-400' : 'text-red-400'}`}>{actionMsg}</p>}
      </div>

      {/* Calendar */}
      <div className="rounded-xl p-5" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Month nav */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth} className="px-3 py-1 rounded bg-white/5 text-gray-300 hover:text-white text-sm">←</button>
          <h2 className="font-semibold text-white">{MONTHS[month]} {year}</h2>
          <button onClick={nextMonth} className="px-3 py-1 rounded bg-white/5 text-gray-300 hover:text-white text-sm">→</button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS.map(d => <div key={d} className="text-center text-xs text-gray-500 font-semibold py-1">{d}</div>)}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            if (!cell) return <div key={i} />
            const { day, iso, record } = cell
            const isToday = iso === new Date().toISOString().slice(0, 10)
            const isFuture = new Date(iso) > new Date()
            const isWeekend = new Date(iso).getDay() === 0 || new Date(iso).getDay() === 6
            const sc = record ? (STATUS_COLOR[record.status] || STATUS_COLOR.present) : null

            return (
              <div
                key={iso}
                className="relative rounded-lg p-1.5 text-center text-sm"
                style={{
                  backgroundColor: isToday ? '#1E6FD920' : sc ? sc.bg : isWeekend ? 'rgba(255,255,255,0.02)' : 'transparent',
                  border: isToday ? '1px solid #1E6FD9' : '1px solid transparent',
                  opacity: isFuture ? 0.4 : 1,
                }}
              >
                <p className={`text-xs font-medium ${isToday ? 'text-blue-400' : isWeekend ? 'text-gray-600' : 'text-gray-400'}`}>{day}</p>
                {sc && <p className="text-[9px] font-semibold mt-0.5" style={{ color: sc.text }}>{sc.label}</p>}
                {record?.workHours && <p className="text-[8px] text-gray-500">{record.workHours}h</p>}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {Object.entries(STATUS_COLOR).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: v.text }} />
              <span className="text-xs text-gray-400">{v.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
