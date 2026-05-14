import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dmApi } from '../../../api/dm.api';
import { Calendar, RefreshCw, TrendingUp, Users, CheckSquare, Palette, AlertTriangle } from 'lucide-react';
import dayjs from 'dayjs';

const PCT_COLOR = (pct) =>
  pct === 100 ? 'text-green-400' : pct >= 60 ? 'text-yellow-400' : 'text-red-400';

const PCT_BAR = (pct) =>
  pct === 100 ? '#22C55E' : pct >= 60 ? '#EAB308' : '#EF4444';

export default function DMHeadDashboard() {
  const [rows,     setRows]     = useState([]);
  const [pipeline, setPipeline] = useState(null);
  const [date,     setDate]     = useState(dayjs().format('YYYY-MM-DD'));
  const [loading,  setLoading]  = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([
        dmApi.getHeadDashboard(date),
        dmApi.getDMGDPipeline(),
      ]);
      setRows(r.data.data.rows || []);
      setPipeline(p.data.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [date]);

  // Group by assignedTo (BDE)
  const bdeMap = {};
  rows.forEach((row) => {
    (row.assignedTo?.length ? row.assignedTo : [{ _id: 'unassigned', name: 'Unassigned' }]).forEach((u) => {
      if (!bdeMap[u._id]) bdeMap[u._id] = { name: u.name, rows: [], totalTasks: 0, doneTasks: 0 };
      bdeMap[u._id].rows.push(row);
      bdeMap[u._id].totalTasks += row.total;
      bdeMap[u._id].doneTasks  += row.completed;
    });
  });
  const bdes = Object.values(bdeMap);

  const totalPlatforms = rows.length;
  const totalTasks     = rows.reduce((s, r) => s + r.total, 0);
  const doneTasks      = rows.reduce((s, r) => s + r.completed, 0);
  const overallPct     = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const behindCount    = rows.filter((r) => r.pct < 60).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">DM Head Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Team workload and completion overview</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#0A1628] border border-[#1A3A6B] rounded-lg px-3 py-2">
            <Calendar size={14} className="text-gray-400" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-sm text-white outline-none" />
          </div>
          <button onClick={load} className="p-2 text-gray-400 hover:text-white border border-[#1A3A6B] rounded-lg">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Platforms Active', value: totalPlatforms, icon: <TrendingUp size={15} />, color: 'text-[#00C6FF]' },
          { label: 'Tasks Done',       value: `${doneTasks}/${totalTasks}`, icon: <CheckSquare size={15} />, color: 'text-green-400' },
          { label: 'Overall %',        value: `${overallPct}%`, icon: <TrendingUp size={15} />, color: PCT_COLOR(overallPct) },
          { label: 'Behind (<60%)',    value: behindCount, icon: <Users size={15} />, color: 'text-red-400' },
        ].map((k) => (
          <div key={k.label} className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">{k.icon} {k.label}</div>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-gray-500 border border-[#1A3A6B] rounded-xl">
          No active platform assignments for this date.
        </div>
      ) : (
        <div className="space-y-6">
          {/* BDE-wise Breakdown */}
          {bdes.map((bde) => (
            <div key={bde.name} className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#1A3A6B] bg-[#1A3A6B]/20">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-gray-400" />
                  <p className="text-white font-semibold">{bde.name}</p>
                  <span className="text-xs text-gray-500">{bde.rows.length} platform{bde.rows.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{bde.doneTasks}/{bde.totalTasks}</span>
                  <span className={`text-sm font-bold ${PCT_COLOR(bde.totalTasks > 0 ? Math.round((bde.doneTasks / bde.totalTasks) * 100) : 0)}`}>
                    {bde.totalTasks > 0 ? Math.round((bde.doneTasks / bde.totalTasks) * 100) : 0}%
                  </span>
                </div>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-[#1A3A6B]">
                    <th className="text-left px-4 py-2">Client</th>
                    <th className="text-left px-4 py-2">Platform</th>
                    <th className="text-right px-4 py-2">Done</th>
                    <th className="text-right px-4 py-2">Total</th>
                    <th className="px-4 py-2">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A3A6B]/30">
                  {bde.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-[#1A3A6B]/10">
                      <td className="px-4 py-2.5 text-white">{row.client?.companyName || row.client?.name || '—'}</td>
                      <td className="px-4 py-2.5 text-gray-300">{row.platform?.name || '—'}</td>
                      <td className="px-4 py-2.5 text-right text-green-400">{row.completed}</td>
                      <td className="px-4 py-2.5 text-right text-gray-400">{row.total}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-16 h-1.5 bg-[#1A3A6B] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${row.pct}%`, backgroundColor: PCT_BAR(row.pct) }} />
                          </div>
                          <span className={`text-xs font-medium w-8 text-right ${PCT_COLOR(row.pct)}`}>{row.pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {/* DM ↔ GD Pipeline Widget */}
          {pipeline && (
            <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Palette size={15} className="text-[#00C6FF]" />
                  <h3 className="text-white font-semibold">Pending Creative Work (DM → GD)</h3>
                </div>
                <Link to="/dm/gd-queue" className="text-xs text-[#1E6FD9] hover:underline">View Queue →</Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'In Progress', value: (pipeline.counts?.new || 0) + (pipeline.counts?.in_progress || 0), color: '#1E6FD9' },
                  { label: 'Awaiting Review', value: pipeline.counts?.submitted || 0, color: '#eab308' },
                  { label: 'Revision Sent', value: pipeline.counts?.revision_requested || 0, color: '#FF6B00' },
                  { label: 'Stuck >2 days', value: pipeline.stuckTasks?.length || 0, color: '#ef4444' },
                ].map(s => (
                  <div key={s.label} className="rounded-lg p-3 bg-[#1A3A6B]/40 text-center">
                    <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              {pipeline.stuckTasks?.length > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-red-900/20 border border-red-800/50">
                  <p className="text-red-400 text-xs flex items-center gap-1">
                    <AlertTriangle size={12} /> {pipeline.stuckTasks.length} task(s) submitted but not reviewed in 2+ days
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Behind schedule alert */}
          {behindCount > 0 && (
            <div className="bg-red-900/20 border border-red-800 rounded-xl p-4">
              <p className="text-red-400 font-semibold text-sm">⚠ {behindCount} platform{behindCount !== 1 ? 's' : ''} behind schedule (&lt;60% complete)</p>
              <div className="mt-2 space-y-1">
                {rows.filter((r) => r.pct < 60).map((r, i) => (
                  <p key={i} className="text-xs text-gray-400">
                    {r.client?.companyName || r.client?.name} — {r.platform?.name} ({r.completed}/{r.total} done)
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
