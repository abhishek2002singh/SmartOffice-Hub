import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import { CheckCircle, Clock, AlertCircle, BookOpen, FileText, Calendar, Users, Monitor, ClipboardList } from 'lucide-react'
import onboardingApi from '../../../api/onboarding.api'

const TYPE_ICONS = {
  read_sop:         BookOpen,
  complete_task:    ClipboardList,
  submit_document:  FileText,
  attend_meeting:   Users,
  online_form:      Monitor,
}

const STATUS_COLORS = {
  pending:   'text-gray-400 bg-gray-800',
  completed: 'text-green-300 bg-green-900/40',
  overdue:   'text-red-300 bg-red-900/40',
  skipped:   'text-gray-600 bg-gray-900',
}

function ProgressBar({ items }) {
  const done  = items.filter(i => i.status === 'completed').length
  const total = items.length
  const pct   = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{done}/{total} items completed</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#10b981' : '#1E6FD9' }} />
      </div>
    </div>
  )
}

function ItemCard({ item, progressId, onComplete }) {
  const Icon = TYPE_ICONS[item.type] || ClipboardList
  const [completing, setCompleting] = useState(false)
  const overdue = item.status === 'pending' && item.dueDate && dayjs().isAfter(dayjs(item.dueDate))

  const handle = async () => {
    setCompleting(true)
    await onComplete(progressId, item._id)
    setCompleting(false)
  }

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${item.status === 'completed' ? 'opacity-60' : ''}`}
      style={{ backgroundColor: '#0f1f3d', borderColor: overdue ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.07)' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: item.status === 'completed' ? 'rgba(16,185,129,0.15)' : 'rgba(30,111,217,0.15)' }}>
        {item.status === 'completed'
          ? <CheckCircle size={16} className="text-green-400" />
          : <Icon size={16} className={overdue ? 'text-red-400' : 'text-blue-400'} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${item.status === 'completed' ? 'text-gray-500 line-through' : 'text-white'}`}>{item.title}</p>
        {item.description && <p className="text-gray-500 text-xs mt-0.5">{item.description}</p>}
        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
          {item.sopId && (
            <Link to={`/sops/${item.sopId}`} className="text-blue-400 hover:underline flex items-center gap-1">
              <BookOpen size={11} /> Read SOP
            </Link>
          )}
          <span className="text-gray-600 flex items-center gap-1"><Calendar size={11} /> Day {item.daysFromJoining}</span>
          {item.dueDate && (
            <span className={`flex items-center gap-1 ${overdue ? 'text-red-400' : 'text-gray-600'}`}>
              <Clock size={11} /> Due {dayjs(item.dueDate).format('DD MMM')}
            </span>
          )}
          <span className={`px-1.5 py-0.5 rounded-full ${STATUS_COLORS[item.status] || ''}`}>
            {overdue && item.status === 'pending' ? 'Overdue' : item.status}
          </span>
          <span className="text-gray-700">Assigned to: {item.assignedRole}</span>
        </div>
        {item.completedAt && (
          <p className="text-gray-600 text-xs mt-1">Completed {dayjs(item.completedAt).format('DD MMM YYYY')}</p>
        )}
      </div>
      {item.status === 'pending' && item.assignedRole === 'Self' && (
        <button onClick={handle} disabled={completing}
          className="px-3 py-1.5 rounded-lg text-xs text-white font-medium shrink-0"
          style={{ backgroundColor: completing ? '#1a3a6b' : '#1E6FD9' }}>
          {completing ? '...' : 'Done'}
        </button>
      )}
    </div>
  )
}

export default function MyOnboardingPage() {
  const [progressList, setProgressList] = useState([])
  const [loading, setLoading]           = useState(true)

  const fetch = async () => {
    setLoading(true)
    try {
      const r = await onboardingApi.getMyOnboarding()
      setProgressList(r.data.data.progressList)
    } catch { /* silent */ }
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const markDone = async (progressId, itemId) => {
    await onboardingApi.markItemComplete(progressId, itemId, {})
    fetch()
  }

  if (loading) return <div className="p-6 text-center text-gray-500">Loading your onboarding checklist...</div>

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">My Onboarding</h1>
        <p className="text-gray-400 text-sm mt-0.5">Complete these items to finish your onboarding</p>
      </div>

      {progressList.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList size={40} className="mx-auto text-gray-700 mb-3" />
          <p className="text-gray-500">No onboarding checklist assigned yet</p>
          <p className="text-gray-600 text-sm mt-1">HR will assign one when you join</p>
        </div>
      ) : progressList.map(prog => (
        <div key={prog._id} className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-white font-semibold">{prog.checklistName || prog.checklistId?.name}</h2>
              <p className="text-gray-500 text-xs mt-0.5">Started {dayjs(prog.startDate).format('DD MMM YYYY')}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              prog.overallStatus === 'completed' ? 'text-green-300 bg-green-900/40' :
              prog.overallStatus === 'overdue'   ? 'text-red-300 bg-red-900/40' :
              'text-blue-300 bg-blue-900/40'
            }`}>
              {prog.overallStatus.replace('_', ' ')}
            </span>
          </div>
          <ProgressBar items={prog.items} />
          <div className="space-y-2">
            {prog.items
              .sort((a, b) => a.sortOrder - b.sortOrder || a.daysFromJoining - b.daysFromJoining)
              .map(item => (
                <ItemCard key={item._id} item={item} progressId={prog._id} onComplete={markDone} />
              ))
            }
          </div>
        </div>
      ))}
    </div>
  )
}
