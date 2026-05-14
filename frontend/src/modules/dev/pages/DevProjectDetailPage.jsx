import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { devApi } from '../../../api/dev.api'
import DevMilestonePanel from '../components/DevMilestonePanel'
import DevKanbanBoard   from '../components/DevKanbanBoard'
import DevBugList       from '../components/DevBugList'

const STATUS_FLOW = ['planning', 'active', 'on_hold', 'completed', 'maintenance', 'cancelled']
const STATUS_COLORS = {
  planning:    'bg-yellow-900/30 text-yellow-300 border-yellow-700',
  active:      'bg-green-900/30 text-green-300 border-green-700',
  on_hold:     'bg-orange-900/30 text-orange-300 border-orange-700',
  completed:   'bg-blue-900/30 text-blue-300 border-blue-700',
  maintenance: 'bg-purple-900/30 text-purple-300 border-purple-700',
  cancelled:   'bg-red-900/30 text-red-300 border-red-700',
}
const TABS = ['Overview', 'Milestones', 'Tasks', 'Bugs', 'Team']

export default function DevProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('Overview')
  const [saving, setSaving]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await devApi.getProject(id)
      setData(r.data.data)
    } catch { navigate('/dev/projects') }
    finally { setLoading(false) }
  }, [id, navigate])

  useEffect(() => { load() }, [load])

  const updateStatus = async (status) => {
    setSaving(true)
    try {
      await devApi.updateProject(id, { status })
      await load()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="p-8 text-gray-400 text-center">Loading project...</div>
  if (!data) return null

  const { project, milestones = [], openBugs = 0, taskCounts = {} } = data
  const totalTasks = Object.values(taskCounts).reduce((a, b) => a + b, 0)
  const doneTasks  = taskCounts.done || 0
  const progress   = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => navigate('/dev/projects')} className="text-gray-400 hover:text-white text-sm mb-2">← All Projects</button>
          <h1 className="text-2xl font-bold text-white">{project.name}</h1>
          <p className="text-gray-400 text-sm">{project.clientId?.companyName || project.clientId?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={project.status}
            onChange={e => updateStatus(e.target.value)}
            disabled={saving}
            className={`px-3 py-1.5 rounded-lg border text-sm font-medium cursor-pointer ${STATUS_COLORS[project.status]}`}
          >
            {STATUS_FLOW.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Progress" value={`${progress}%`} sub={`${doneTasks}/${totalTasks} tasks done`} color="text-[#00C6FF]" />
        <StatCard label="Open Bugs" value={openBugs} sub="active issues" color={openBugs > 0 ? 'text-red-400' : 'text-green-400'} />
        <StatCard label="Milestones" value={milestones.length} sub={`${milestones.filter(m => m.status === 'completed').length} completed`} color="text-purple-400" />
        <StatCard label="Priority" value={project.priority} sub="project level" color={project.priority === 'high' ? 'text-red-400' : project.priority === 'medium' ? 'text-yellow-400' : 'text-green-400'} />
      </div>

      {/* Progress bar */}
      {totalTasks > 0 && (
        <div className="bg-[#1A3A6B] rounded-xl p-4">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Task Completion</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-blue-900 rounded-full overflow-hidden">
            <div className="h-full bg-[#1E6FD9] rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-blue-900">
        <nav className="flex gap-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-[#1E6FD9] text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>
              {t}
              {t === 'Bugs' && openBugs > 0 && <span className="ml-1 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full">{openBugs}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === 'Overview'    && <OverviewTab project={project} />}
      {tab === 'Milestones'  && <DevMilestonePanel projectId={id} milestones={milestones} onRefresh={load} />}
      {tab === 'Tasks'       && <DevKanbanBoard projectId={id} taskCounts={taskCounts} />}
      {tab === 'Bugs'        && <DevBugList projectId={id} />}
      {tab === 'Team'        && <TeamTab project={project} onRefresh={load} />}
    </div>
  )
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-[#1A3A6B] rounded-xl p-4 border border-blue-900">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
    </div>
  )
}

function OverviewTab({ project }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Key Info */}
      <div className="bg-[#1A3A6B] rounded-xl p-5 border border-blue-900 space-y-4">
        <h3 className="font-semibold text-white">Project Info</h3>
        <Row label="Type" value={`${project.type?.replace('_', ' ')}${project.ecommercePlatform ? ` (${project.ecommercePlatform})` : ''}`} />
        <Row label="Start Date"   value={project.startDate ? new Date(project.startDate).toLocaleDateString('en-IN') : '—'} />
        <Row label="Planned End"  value={project.plannedEndDate ? new Date(project.plannedEndDate).toLocaleDateString('en-IN') : '—'} />
        <Row label="Actual End"   value={project.actualEndDate ? new Date(project.actualEndDate).toLocaleDateString('en-IN') : '—'} />
        {project.description && (
          <div>
            <p className="text-xs text-gray-400">Description</p>
            <p className="text-sm text-gray-300 mt-1">{project.description}</p>
          </div>
        )}
      </div>

      {/* Tech & Links */}
      <div className="bg-[#1A3A6B] rounded-xl p-5 border border-blue-900 space-y-4">
        <h3 className="font-semibold text-white">Tech & Links</h3>
        {project.techStack?.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 mb-2">Tech Stack</p>
            <div className="flex flex-wrap gap-1">
              {project.techStack.map((t, i) => <span key={i} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{t}</span>)}
            </div>
          </div>
        )}
        {project.codeRepoUrl && <LinkRow label="Code Repo" href={project.codeRepoUrl} />}
        {project.stagingUrl   && <LinkRow label="Staging"   href={project.stagingUrl} />}
        {project.productionUrl && <LinkRow label="Production" href={project.productionUrl} />}
        {project.amcEnabled && (
          <div className="mt-2 p-3 bg-purple-900/20 border border-purple-800/30 rounded-lg">
            <p className="text-xs text-purple-300 font-medium">AMC Active — {project.amcDurationMonths} months</p>
            {project.amcStartDate && <p className="text-xs text-gray-400">Start: {new Date(project.amcStartDate).toLocaleDateString('en-IN')}</p>}
            {project.amcEndDate   && <p className="text-xs text-gray-400">End: {new Date(project.amcEndDate).toLocaleDateString('en-IN')}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

function TeamTab({ project }) {
  const team = [
    project.projectManager && { role: 'Project Manager', user: project.projectManager },
    project.leadDeveloper  && { role: 'Lead Developer',  user: project.leadDeveloper },
    ...(project.teamMembers || []).map(u => ({ role: 'Team Member', user: u })),
  ].filter(Boolean)

  return (
    <div className="bg-[#1A3A6B] rounded-xl p-5 border border-blue-900">
      <h3 className="font-semibold text-white mb-4">Team Members ({team.length})</h3>
      {team.length === 0 ? (
        <p className="text-gray-400 text-sm">No team members assigned yet.</p>
      ) : (
        <div className="space-y-3">
          {team.map((t, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#1E6FD9] flex items-center justify-center text-white text-sm font-bold">
                {t.user?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="text-sm text-white">{t.user?.name || 'Unknown'}</p>
                <p className="text-xs text-gray-400">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm text-gray-200 capitalize">{value}</span>
    </div>
  )
}

function LinkRow({ label, href }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-400">{label}</span>
      <a href={href} target="_blank" rel="noopener noreferrer"
        className="text-xs text-[#00C6FF] hover:underline truncate max-w-[200px]"
        onClick={e => e.stopPropagation()}>
        {href}
      </a>
    </div>
  )
}
