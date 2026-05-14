import { useState, useEffect, useRef } from 'react'
import { devApi } from '../../../api/dev.api'

function fmt(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':')
}

export default function DevTimerWidget({ projectId, taskId, actualHours, estimatedHours, onLogged }) {
  const [running, setRunning]     = useState(false)
  const [elapsed, setElapsed]     = useState(0)
  const [logs, setLogs]           = useState([])
  const [loadingLogs, setLoading] = useState(true)
  const [notes, setNotes]         = useState('')
  const [manual, setManual]       = useState({ h: '', m: '' })
  const [manualNotes, setManualNotes] = useState('')
  const [mode, setMode]           = useState('timer') // 'timer' | 'manual'
  const [saving, setSaving]       = useState(false)
  const intervalRef = useRef(null)
  const startRef    = useRef(null)

  useEffect(() => {
    loadLogs()
    return () => clearInterval(intervalRef.current)
  }, [taskId])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const r = await devApi.listTimeLogs(projectId, taskId)
      setLogs(r.data.data.logs || [])
    } catch (_) {}
    finally { setLoading(false) }
  }

  const startTimer = () => {
    startRef.current = Date.now() - elapsed * 1000
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    }, 1000)
    setRunning(true)
  }

  const stopTimer = () => {
    clearInterval(intervalRef.current)
    setRunning(false)
  }

  const logTimer = async () => {
    if (elapsed < 60) return
    setSaving(true)
    try {
      await devApi.addTimeLog(projectId, taskId, {
        minutes: Math.floor(elapsed / 60),
        notes: notes.trim() || undefined,
      })
      setElapsed(0)
      setNotes('')
      setRunning(false)
      clearInterval(intervalRef.current)
      await loadLogs()
      onLogged?.()
    } catch (_) {}
    finally { setSaving(false) }
  }

  const logManual = async () => {
    const totalMin = (parseInt(manual.h) || 0) * 60 + (parseInt(manual.m) || 0)
    if (totalMin < 1) return
    setSaving(true)
    try {
      await devApi.addTimeLog(projectId, taskId, {
        minutes: totalMin,
        notes: manualNotes.trim() || undefined,
      })
      setManual({ h: '', m: '' })
      setManualNotes('')
      await loadLogs()
      onLogged?.()
    } catch (_) {}
    finally { setSaving(false) }
  }

  const totalLogged = logs.reduce((s, l) => s + l.minutes, 0)
  const pct = estimatedHours
    ? Math.min(100, Math.round((totalLogged / (estimatedHours * 60)) * 100))
    : null

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      {estimatedHours && (
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Time progress</span>
            <span>{Math.floor(totalLogged / 60)}h {totalLogged % 60}m / {estimatedHours}h</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-[#1E6FD9]'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{pct}% of estimate used</p>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-1 bg-[#1A3A6B] rounded-lg p-1 w-fit">
        {['timer', 'manual'].map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors ${mode === m ? 'bg-[#1E6FD9] text-white' : 'text-gray-400 hover:text-white'}`}>
            {m === 'timer' ? 'Timer' : 'Manual Entry'}
          </button>
        ))}
      </div>

      {mode === 'timer' ? (
        <div className="bg-[#1A3A6B] rounded-xl p-4 space-y-3">
          {/* Timer display */}
          <div className="text-center">
            <span className={`text-4xl font-mono font-bold ${running ? 'text-[#00C6FF]' : elapsed > 0 ? 'text-yellow-300' : 'text-gray-300'}`}>
              {fmt(elapsed)}
            </span>
          </div>

          {/* Controls */}
          <div className="flex gap-2 justify-center">
            {!running ? (
              <button onClick={startTimer}
                className="px-5 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-medium">
                {elapsed > 0 ? 'Resume' : 'Start Timer'}
              </button>
            ) : (
              <button onClick={stopTimer}
                className="px-5 py-2 bg-yellow-700 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium">
                Pause
              </button>
            )}
            {elapsed >= 60 && !running && (
              <button onClick={logTimer} disabled={saving}
                className="px-5 py-2 bg-[#1E6FD9] hover:bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? 'Logging...' : 'Log Time'}
              </button>
            )}
            {elapsed > 0 && !running && (
              <button onClick={() => setElapsed(0)} className="px-3 py-2 text-gray-400 hover:text-red-400 text-sm">
                Reset
              </button>
            )}
          </div>

          {elapsed >= 60 && !running && (
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="w-full bg-[#0A1628] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500"
            />
          )}
          {elapsed > 0 && elapsed < 60 && !running && (
            <p className="text-xs text-center text-gray-500">Need at least 1 minute to log</p>
          )}
        </div>
      ) : (
        <div className="bg-[#1A3A6B] rounded-xl p-4 space-y-3">
          <p className="text-xs text-gray-400">Log time manually</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Hours</label>
              <input type="number" min="0" max="23" value={manual.h}
                onChange={e => setManual(v => ({ ...v, h: e.target.value }))}
                className="w-full bg-[#0A1628] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm text-center"
                placeholder="0" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Minutes</label>
              <input type="number" min="0" max="59" value={manual.m}
                onChange={e => setManual(v => ({ ...v, m: e.target.value }))}
                className="w-full bg-[#0A1628] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm text-center"
                placeholder="0" />
            </div>
          </div>
          <input
            value={manualNotes}
            onChange={e => setManualNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="w-full bg-[#0A1628] border border-blue-800 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500"
          />
          <button onClick={logManual} disabled={saving || (!manual.h && !manual.m)}
            className="w-full py-2 bg-[#1E6FD9] hover:bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-40">
            {saving ? 'Saving...' : 'Log Time'}
          </button>
        </div>
      )}

      {/* Log history */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Time Log History</h4>
        {loadingLogs ? (
          <p className="text-sm text-gray-500 text-center py-4">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No time logged yet.</p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {logs.map((l, i) => (
              <div key={l._id || i} className="flex items-center justify-between bg-[#1A3A6B] rounded-lg px-3 py-2">
                <div>
                  <span className="text-sm text-white font-medium">
                    {Math.floor(l.minutes / 60)}h {l.minutes % 60}m
                  </span>
                  {l.notes && <span className="text-xs text-gray-400 ml-2">— {l.notes}</span>}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{l.user?.name || 'You'}</p>
                  <p className="text-xs text-gray-600">
                    {new Date(l.date || l.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
