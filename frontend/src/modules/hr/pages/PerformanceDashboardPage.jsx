import { useState, useEffect } from 'react'
import { hrApi } from '../../../api/hr.api'
import { useSelector } from 'react-redux'
import { BarChart2, TrendingUp, Users, Star } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'

const RATING_LABEL = { 1: 'Needs Improvement', 2: 'Below Average', 3: 'Meets Expectations', 4: 'Exceeds Expectations', 5: 'Outstanding' }
const RATING_COLOR = { 1: '#EF4444', 2: '#F97316', 3: '#EAB308', 4: '#22C55E', 5: '#00C6FF' }

function StatCard({ label, value, sub, color }) {
  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-bold" style={{ color: color || '#fff' }}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

function StarDisplay({ value, max = 5 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} size={12} className={i < value ? 'text-yellow-400' : 'text-gray-600'} fill={i < value ? 'currentColor' : 'none'} />
      ))}
    </div>
  )
}

/* ── Employee self view ── */
function EmployeeDashboard() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    hrApi.getMyPerfHistory()
      .then(r => setHistory(r.data.data.history || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-10 text-gray-500 text-sm">Loading…</div>

  if (!history.length) return (
    <div className="rounded-xl p-10 text-center text-gray-400" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
      No performance evaluations found yet.
    </div>
  )

  const chartData = history.map(h => ({
    name: h.cycleName,
    self: h.selfRating || 0,
    manager: h.managerRating || 0,
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Cycles Reviewed" value={history.length} />
        <StatCard
          label="Latest Manager Rating"
          value={history[0]?.managerRating ? `${history[0].managerRating}/5` : '—'}
          sub={history[0]?.managerRating ? RATING_LABEL[Math.round(history[0].managerRating)] : undefined}
          color="#00C6FF"
        />
        <StatCard
          label="Latest Self Rating"
          value={history[0]?.selfRating ? `${history[0].selfRating}/5` : '—'}
          sub="Your self-assessment"
          color="#1E6FD9"
        />
      </div>

      {chartData.length > 1 && (
        <div className="rounded-xl p-5" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-sm font-semibold text-white mb-4">Rating Trend</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barGap={4}>
              <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 5]} ticks={[1,2,3,4,5]} tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 12 }} />
              <Bar dataKey="manager" name="Manager Rating" fill="#1E6FD9" radius={[4,4,0,0]} />
              <Bar dataKey="self" name="Self Rating" fill="#1A3A6B" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              {['Cycle', 'Self Rating', 'Manager Rating', 'Increment %', 'Promotion'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-semibold uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map((h, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td className="px-4 py-3 text-white font-medium">{h.cycleName}</td>
                <td className="px-4 py-3">
                  {h.selfRating ? <div className="flex items-center gap-2"><StarDisplay value={h.selfRating} /><span className="text-xs text-gray-400">{h.selfRating}/5</span></div> : <span className="text-gray-600">—</span>}
                </td>
                <td className="px-4 py-3">
                  {h.managerRating ? (
                    <div>
                      <div className="flex items-center gap-2"><StarDisplay value={Math.round(h.managerRating)} /><span className="text-xs text-gray-400">{h.managerRating}/5</span></div>
                      <p className="text-xs text-gray-500 mt-0.5">{RATING_LABEL[Math.round(h.managerRating)]}</p>
                    </div>
                  ) : <span className="text-gray-600">—</span>}
                </td>
                <td className="px-4 py-3">
                  {h.incrementRecommendation != null
                    ? <span className={`font-medium ${h.incrementRecommendation > 0 ? 'text-green-400' : 'text-gray-400'}`}>{h.incrementRecommendation}%</span>
                    : <span className="text-gray-600">—</span>}
                </td>
                <td className="px-4 py-3">
                  {h.promotionRecommendation
                    ? <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-cyan-500/20 text-cyan-300">Yes</span>
                    : <span className="text-gray-600">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Manager team view ── */
function ManagerDashboard() {
  const [cycles, setCycles]   = useState([])
  const [cycleId, setCycleId] = useState('')
  const [report, setReport]   = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    hrApi.listCycles().then(r => {
      const cs = r.data.data.cycles
      setCycles(cs)
      const active = cs.find(c => c.status === 'active')
      if (active) setCycleId(active._id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!cycleId) return
    setLoading(true)
    hrApi.getPerformanceReport({ cycleId })
      .then(r => setReport(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [cycleId])

  const inp = "px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white outline-none"

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400">Cycle:</label>
        <select className={inp + ' w-64'} value={cycleId} onChange={e => setCycleId(e.target.value)}>
          <option value="">Select cycle…</option>
          {cycles.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>

      {loading && <div className="text-center py-10 text-gray-500 text-sm">Loading…</div>}

      {report && !loading && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Total Reviewed" value={report.totalReviewed || 0} />
            <StatCard label="Self Evals Submitted" value={report.selfEvalCount || 0} />
            <StatCard label="Promotions Recommended" value={report.promotionsCount || 0} color="#00C6FF" />
            <StatCard
              label="Avg Manager Rating"
              value={report.avgManagerRating ? report.avgManagerRating.toFixed(1) : '—'}
              sub={report.avgManagerRating ? RATING_LABEL[Math.round(report.avgManagerRating)] : undefined}
              color="#1E6FD9"
            />
          </div>

          {/* Rating distribution */}
          {report.ratingDistribution?.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl p-5" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-sm font-semibold text-white mb-4">Rating Distribution</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={report.ratingDistribution} barSize={32}>
                    <XAxis dataKey="rating" tickFormatter={v => RATING_LABEL[v]?.split(' ')[0]} tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      formatter={(v, _, props) => [v, RATING_LABEL[props.payload.rating]]}
                      contentStyle={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 12 }}
                    />
                    <Bar dataKey="count" radius={[4,4,0,0]}>
                      {report.ratingDistribution.map(d => (
                        <Cell key={d.rating} fill={RATING_COLOR[d.rating] || '#1E6FD9'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top performers */}
              {report.topPerformers?.length > 0 && (
                <div className="rounded-xl p-5" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-sm font-semibold text-white mb-4">Top Performers</p>
                  <div className="space-y-3">
                    {report.topPerformers.slice(0, 5).map((p, idx) => (
                      <div key={p.employeeId} className="flex items-center gap-3">
                        <span className="text-lg font-bold text-gray-600 w-6">#{idx + 1}</span>
                        <div className="flex-1">
                          <p className="text-sm text-white font-medium">{p.name}</p>
                          <StarDisplay value={Math.round(p.rating)} />
                        </div>
                        <span className="text-sm font-semibold" style={{ color: RATING_COLOR[Math.round(p.rating)] }}>
                          {p.rating.toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Employee breakdown table */}
          {report.employees?.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="px-4 py-3 text-sm font-semibold text-white border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>Team Breakdown</p>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    {['Employee', 'Self Eval', 'Manager Rating', 'Goals', 'Increment', 'Promotion'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs text-gray-400 font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.employees.map(emp => (
                    <tr key={emp.employeeId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{emp.name}</p>
                        <p className="text-xs text-gray-500">{emp.employeeCode}</p>
                      </td>
                      <td className="px-4 py-3">
                        {emp.selfSubmitted
                          ? <span className="text-xs text-green-400">✓ Submitted</span>
                          : <span className="text-xs text-gray-600">Pending</span>}
                      </td>
                      <td className="px-4 py-3">
                        {emp.managerRating
                          ? <div className="flex items-center gap-2"><StarDisplay value={Math.round(emp.managerRating)} /><span className="text-xs text-gray-400">{emp.managerRating}/5</span></div>
                          : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-xs">{emp.goalsCount ?? '—'}</td>
                      <td className="px-4 py-3">
                        {emp.incrementRecommendation != null
                          ? <span className={`text-sm font-medium ${emp.incrementRecommendation > 0 ? 'text-green-400' : 'text-gray-400'}`}>{emp.incrementRecommendation}%</span>
                          : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {emp.promotionRecommendation
                          ? <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-cyan-500/20 text-cyan-300">Yes</span>
                          : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ── HR org-wide view ── same as manager but no role restriction ── */
const HRDashboard = ManagerDashboard

/* ── Root component ── */
export default function PerformanceDashboardPage() {
  const { user } = useSelector(s => s.auth)
  const role = user?.role

  const isHR      = ['SUPERADMIN', 'ADMIN'].includes(role)
  const isManager = ['DEPT_HEAD', 'SUBADMIN'].includes(role) || isHR

  const tabs = [
    { key: 'my',   label: 'My Performance',  always: true },
    { key: 'team', label: 'Team Overview',    show: isManager },
    { key: 'org',  label: 'Org Dashboard',   show: isHR },
  ].filter(t => t.always || t.show)

  const [tab, setTab] = useState(tabs[0].key)

  return (
    <div className="p-6 space-y-6" style={{ color: '#fff' }}>
      <div className="flex items-center gap-3">
        <BarChart2 size={22} style={{ color: '#1E6FD9' }} />
        <h1 className="text-xl font-bold">Performance Dashboard</h1>
      </div>

      {tabs.length > 1 && (
        <div className="flex gap-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.key ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'my'   && <EmployeeDashboard />}
      {tab === 'team' && <ManagerDashboard />}
      {tab === 'org'  && <HRDashboard />}
    </div>
  )
}
