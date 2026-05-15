import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { hrApi } from '../../../api/hr.api'
import { useSelector } from 'react-redux'
import { CheckSquare, Square, FileDown, ClipboardCheck } from 'lucide-react'
import dayjs from 'dayjs'

const inp = "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 outline-none w-full"

const STATUS_COLOR = {
  initiated:   'bg-blue-500/20 text-blue-300',
  in_progress: 'bg-yellow-500/20 text-yellow-300',
  completed:   'bg-green-500/20 text-green-300',
}

function CheckItem({ item, onToggle, isManager }) {
  return (
    <div className="flex items-start justify-between py-3 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <div className="flex items-start gap-3 flex-1">
        <button onClick={() => isManager && onToggle(item.key, !item.completed)}
          className={`mt-0.5 flex-shrink-0 ${isManager ? 'cursor-pointer' : 'cursor-default'}`}>
          {item.completed
            ? <CheckSquare size={18} className="text-green-400" />
            : <Square size={18} className="text-gray-600" />}
        </button>
        <div>
          <p className={`text-sm font-medium ${item.completed ? 'line-through text-gray-500' : 'text-white'}`}>{item.label}</p>
          {item.completedAt && (
            <p className="text-xs text-gray-500 mt-0.5">Completed {dayjs(item.completedAt).format('DD MMM YYYY')}</p>
          )}
          {item.notes && <p className="text-xs text-gray-400 mt-0.5 italic">"{item.notes}"</p>}
        </div>
      </div>
    </div>
  )
}

export default function ExitWorkflowPage() {
  const { id: employeeId } = useParams()
  const { user } = useSelector(s => s.auth)
  const isManager = ['ADMIN', 'SUPERADMIN', 'DEPT_HEAD', 'SUBADMIN'].includes(user?.role)

  const [checklist, setChecklist] = useState(null)
  const [emp, setEmp]             = useState(null)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [downloading, setDownloading] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [cr, er] = await Promise.all([
        hrApi.getExitChecklist(employeeId),
        hrApi.getEmployee(employeeId),
      ])
      setChecklist(cr.data.data.checklist)
      setEmp(er.data.data.employee)
    } catch (_) {}
    setLoading(false)
  }

  useEffect(() => { load() }, [employeeId])

  const toggleItem = async (itemKey, completed) => {
    setSaving(true)
    try {
      const r = await hrApi.updateExitChecklist(employeeId, { itemKey, completed })
      setChecklist(r.data.data.checklist)
    } catch (_) {}
    setSaving(false)
  }

  const acknowledge = async (type) => {
    setSaving(true)
    try {
      const payload = type === 'manager' ? { acknowledgeManager: true } : { acknowledgeHR: true }
      const r = await hrApi.updateExitChecklist(employeeId, payload)
      setChecklist(r.data.data.checklist)
    } catch (_) {}
    setSaving(false)
  }

  const downloadDoc = async (type) => {
    setDownloading(type)
    try {
      const fn = type === 'relieving' ? hrApi.getRelievingLetter : hrApi.getExperienceLetter
      const r = await fn(employeeId)
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}_letter_${emp?.employeeCode || employeeId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (_) {}
    setDownloading('')
  }

  if (loading) return <div className="p-6 text-gray-500 text-sm">Loading exit workflow…</div>

  if (!checklist) return (
    <div className="p-6 space-y-4" style={{ color: '#fff' }}>
      <h1 className="text-xl font-bold">Exit Workflow</h1>
      <div className="rounded-xl p-8 text-center text-gray-400" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        No exit process initiated for this employee.
      </div>
    </div>
  )

  const completedCount = checklist.items?.filter(i => i.completed).length || 0
  const totalCount     = checklist.items?.length || 0
  const progress       = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="p-6 space-y-6" style={{ color: '#fff' }}>
      <div className="flex items-center gap-3">
        <ClipboardCheck size={22} style={{ color: '#1E6FD9' }} />
        <h1 className="text-xl font-bold">Exit Workflow{emp ? ` — ${emp.firstName} ${emp.lastName}` : ''}</h1>
        {emp && <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(0,198,255,0.1)', color: '#00C6FF' }}>{emp.employeeCode}</span>}
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLOR[checklist.status]}`}>{checklist.status.replace('_', ' ')}</span>
      </div>

      {/* Timeline summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Resignation Date', value: checklist.resignationDate ? dayjs(checklist.resignationDate).format('DD MMM YYYY') : '—' },
          { label: 'Last Working Day', value: checklist.lastWorkingDay  ? dayjs(checklist.lastWorkingDay).format('DD MMM YYYY')  : '—' },
          { label: 'Notice Period', value: `${checklist.noticePeriodDays} days` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl p-4" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-white font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="rounded-xl p-5" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-white">Checklist Progress</p>
          <span className="text-sm font-semibold text-white">{completedCount}/{totalCount} ({progress}%)</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: progress === 100 ? '#10B981' : '#1E6FD9' }} />
        </div>
      </div>

      {/* Checklist items */}
      <div className="rounded-xl p-5" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="font-semibold text-white text-sm mb-3">Exit Checklist {saving && <span className="text-xs text-gray-500 font-normal ml-2">Saving…</span>}</p>
        {checklist.items?.map(item => (
          <CheckItem key={item.key} item={item} onToggle={toggleItem} isManager={isManager} />
        ))}
      </div>

      {/* Acknowledgements */}
      <div className="rounded-xl p-5 space-y-3" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="font-semibold text-white text-sm">Acknowledgements</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {checklist.acknowledgedByManager
              ? <CheckSquare size={16} className="text-green-400" />
              : <Square size={16} className="text-gray-600" />}
            <span className="text-sm text-gray-300">Manager Acknowledged</span>
          </div>
          {isManager && !checklist.acknowledgedByManager && (
            <button onClick={() => acknowledge('manager')} disabled={saving}
              className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
              style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
              Acknowledge
            </button>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {checklist.acknowledgedByHR
              ? <CheckSquare size={16} className="text-green-400" />
              : <Square size={16} className="text-gray-600" />}
            <span className="text-sm text-gray-300">HR Acknowledged</span>
          </div>
          {['ADMIN', 'SUPERADMIN'].includes(user?.role) && !checklist.acknowledgedByHR && (
            <button onClick={() => acknowledge('hr')} disabled={saving}
              className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
              style={{ backgroundColor: '#1E6FD9', color: '#fff' }}>
              Acknowledge
            </button>
          )}
        </div>
      </div>

      {/* Exit documents */}
      {isManager && (
        <div className="rounded-xl p-5 space-y-3" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="font-semibold text-white text-sm">Exit Documents</p>
          <div className="flex gap-3">
            <button onClick={() => downloadDoc('relieving')} disabled={!!downloading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 bg-white/10 text-gray-300 hover:text-white">
              <FileDown size={14} />
              {downloading === 'relieving' ? 'Generating…' : 'Relieving Letter'}
            </button>
            <button onClick={() => downloadDoc('experience')} disabled={!!downloading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 bg-white/10 text-gray-300 hover:text-white">
              <FileDown size={14} />
              {downloading === 'experience' ? 'Generating…' : 'Experience Certificate'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
