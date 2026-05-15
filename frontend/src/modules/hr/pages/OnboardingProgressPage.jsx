import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { ArrowLeft, ClipboardList, CheckCircle, AlertCircle, Clock, UserPlus, Users } from 'lucide-react'
import onboardingApi from '../../../api/onboarding.api'
import hrApi from '../../../api/hr.api'

const STATUS_COLORS = {
  in_progress: 'text-blue-300 bg-blue-900/40',
  completed:   'text-green-300 bg-green-900/40',
  overdue:     'text-red-300 bg-red-900/40',
}
const STATUS_ICONS = { in_progress: Clock, completed: CheckCircle, overdue: AlertCircle }

function AssignModal({ onDone, onClose }) {
  const [employees, setEmployees]   = useState([])
  const [templates, setTemplates]   = useState([])
  const [empId, setEmpId]           = useState('')
  const [tmplId, setTmplId]         = useState('')
  const [startDate, setStartDate]   = useState('')
  const [saving, setSaving]         = useState(false)
  const [err, setErr]               = useState('')

  useEffect(() => {
    Promise.all([
      hrApi.getEmployees ? hrApi.getEmployees({ limit: 100 }) : Promise.resolve({ data: { data: { employees: [] } } }),
      onboardingApi.listTemplates(),
    ]).then(([er, tr]) => {
      setEmployees(er.data?.data?.employees || [])
      setTemplates(tr.data.data.templates)
      if (tr.data.data.templates.length > 0) setTmplId(tr.data.data.templates[0]._id)
    }).catch(() => {})
  }, [])

  const submit = async () => {
    if (!empId || !tmplId) { setErr('Select an employee and template'); return }
    setSaving(true); setErr('')
    try { await onboardingApi.assignOnboarding({ employeeId: empId, checklistId: tmplId, startDate }); onDone() }
    catch (e) { setErr(e.response?.data?.error?.message || 'Failed to assign') }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="rounded-2xl p-6 w-full max-w-md space-y-4" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.1)' }}>
        <h3 className="text-white font-bold text-lg">Assign Onboarding Checklist</h3>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Employee</label>
          <select value={empId} onChange={e => setEmpId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm text-white border" style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(255,255,255,0.08)' }}>
            <option value="">Select employee</option>
            {employees.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Checklist Template</label>
          <select value={tmplId} onChange={e => setTmplId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm text-white border" style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(255,255,255,0.08)' }}>
            {templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Start Date (optional — defaults to joining date)</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm text-white border" style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(255,255,255,0.08)' }} />
        </div>
        {err && <p className="text-red-400 text-xs">{err}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-gray-400 border text-sm" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>Cancel</button>
          <button onClick={submit} disabled={saving} className="flex-1 py-2 rounded-xl text-white text-sm font-medium" style={{ backgroundColor: '#1E6FD9' }}>
            {saving ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function OnboardingProgressPage() {
  const navigate = useNavigate()
  const [progressList, setProgressList] = useState([])
  const [loading, setLoading]           = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showAssign, setShowAssign]     = useState(false)

  const fetch = async () => {
    setLoading(true)
    try {
      const params = { limit: 50 }
      if (statusFilter) params.status = statusFilter
      const r = await onboardingApi.listAllProgress(params)
      setProgressList(r.data.data.progressList)
    } catch { /* silent */ }
    setLoading(false)
  }

  useEffect(() => { fetch() }, [statusFilter])

  const pct = (items) => {
    const done = items.filter(i => i.status === 'completed').length
    return items.length === 0 ? 0 : Math.round((done / items.length) * 100)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {showAssign && <AssignModal onDone={() => { setShowAssign(false); fetch() }} onClose={() => setShowAssign(false)} />}

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/hr/employees')} className="text-gray-500 hover:text-white"><ArrowLeft size={18} /></button>
        <h1 className="text-xl font-bold text-white flex-1">Onboarding Progress</h1>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm text-white border"
          style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(255,255,255,0.08)' }}>
          <option value="">All Statuses</option>
          <option value="in_progress">In Progress</option>
          <option value="overdue">Overdue</option>
          <option value="completed">Completed</option>
        </select>
        <button onClick={() => setShowAssign(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
          style={{ backgroundColor: '#1E6FD9' }}>
          <UserPlus size={14} /> Assign
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : progressList.length === 0 ? (
        <div className="text-center py-16">
          <Users size={40} className="mx-auto text-gray-700 mb-3" />
          <p className="text-gray-500">No onboarding records found</p>
          <button onClick={() => setShowAssign(true)} className="mt-2 text-blue-400 text-sm hover:underline">Assign first checklist</button>
        </div>
      ) : (
        <div className="space-y-3">
          {progressList.map(prog => {
            const emp  = prog.employeeId
            const p    = pct(prog.items)
            const Icon = STATUS_ICONS[prog.overallStatus] || Clock
            return (
              <div key={prog._id} className="flex items-center gap-4 p-4 rounded-xl border"
                style={{ backgroundColor: '#0f1f3d', borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium text-sm">{emp?.firstName} {emp?.lastName}</p>
                    <span className="text-gray-600 text-xs">{emp?.employeeCode}</span>
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">{prog.checklistName} · Started {dayjs(prog.startDate).format('DD MMM YY')}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 rounded-full bg-white/10">
                      <div className="h-1.5 rounded-full" style={{ width: `${p}%`, backgroundColor: p === 100 ? '#10b981' : '#1E6FD9' }} />
                    </div>
                    <span className="text-xs text-gray-500">{p}%</span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 shrink-0 ${STATUS_COLORS[prog.overallStatus]}`}>
                  <Icon size={11} />
                  {prog.overallStatus.replace('_', ' ')}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
