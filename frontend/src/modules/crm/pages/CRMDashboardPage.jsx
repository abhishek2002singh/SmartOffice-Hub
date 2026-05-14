import { useEffect, useState } from 'react';
import {
  BarChart, Bar, FunnelChart, Funnel, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { crmApi } from '../../../api/crm.api';
import { TrendingUp, Users, Building2, AlertCircle, RefreshCw, Calendar, Download } from 'lucide-react';

const STAGE_COLORS = {
  new: '#6B7280', assigned: '#3B82F6', contacted: '#6366F1',
  qualified: '#06B6D4', proposal: '#A855F7', negotiation: '#EAB308',
  won: '#22C55E', lost: '#EF4444', junk: '#374151',
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export default function CRMDashboardPage() {
  const [summary,  setSummary]  = useState(null);
  const [pipeline, setPipeline] = useState([]);
  const [funnel,   setFunnel]   = useState([]);
  const [sources,  setSources]  = useState([]);
  const [bdes,     setBdes]     = useState([]);
  const [loading,  setLoading]  = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [s, p, f, src, b] = await Promise.all([
        crmApi.dashboard(),
        crmApi.pipeline(),
        crmApi.funnel(),
        crmApi.sources(),
        crmApi.bdePerf(),
      ]);
      setSummary(s.data.data);
      setPipeline(p.data.data.pipeline);
      setFunnel(f.data.data.funnel);
      setSources(src.data.data.sources);
      setBdes(b.data.data.bdes);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const exportLeads = async () => {
    const r = await crmApi.exportLeads();
    downloadBlob(r.data, 'leads_export.csv');
  };

  const exportClients = async () => {
    const r = await crmApi.exportClients();
    downloadBlob(r.data, 'clients_export.csv');
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">CRM Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Sales pipeline overview</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportLeads} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-[#1A3A6B] text-gray-300 hover:text-white rounded-lg">
            <Download size={13} /> Leads CSV
          </button>
          <button onClick={exportClients} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-[#1A3A6B] text-gray-300 hover:text-white rounded-lg">
            <Download size={13} /> Clients CSV
          </button>
          <button onClick={load} className="p-2 text-gray-400 hover:text-white border border-[#1A3A6B] rounded-lg"><RefreshCw size={14} /></button>
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Leads Today',     value: summary.leadsToday,      icon: <TrendingUp size={16} />,  color: 'text-[#00C6FF]' },
            { label: 'This Week',       value: summary.leadsThisWeek,   icon: <Calendar size={16} />,    color: 'text-purple-400' },
            { label: 'Active Clients',  value: summary.activeClients,   icon: <Building2 size={16} />,   color: 'text-green-400' },
            { label: 'Conversion Rate', value: `${summary.conversionRate}%`, icon: <Users size={16} />, color: 'text-yellow-400' },
          ].map((k) => (
            <div key={k.label} className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl p-5">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">{k.icon} {k.label}</div>
              <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Alert Row */}
      {summary && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-orange-900/20 border border-orange-800 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle size={20} className="text-orange-400 shrink-0" />
            <div>
              <p className="text-white font-semibold">{summary.staleAlerts} Stale Leads</p>
              <p className="text-xs text-gray-400">No activity beyond threshold</p>
            </div>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-4 flex items-center gap-3">
            <Calendar size={20} className="text-yellow-400 shrink-0" />
            <div>
              <p className="text-white font-semibold">{summary.renewalsDue30} Renewals Due</p>
              <p className="text-xs text-gray-400">In the next 30 days</p>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pipeline by Stage (Bar) */}
        <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Pipeline by Stage</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pipeline} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A3A6B" />
              <XAxis dataKey="_id" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <Tooltip contentStyle={{ backgroundColor: '#0A1628', border: '1px solid #1A3A6B', borderRadius: 8 }} labelStyle={{ color: '#fff' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {pipeline.map((entry) => (
                  <Cell key={entry._id} fill={STAGE_COLORS[entry._id] || '#3B82F6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Sources (Bar) */}
        <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Top Lead Sources</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sources.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A3A6B" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <YAxis type="category" dataKey="source" tick={{ fontSize: 10, fill: '#9CA3AF' }} width={90} />
              <Tooltip contentStyle={{ backgroundColor: '#0A1628', border: '1px solid #1A3A6B', borderRadius: 8 }} />
              <Bar dataKey="total" fill="#1E6FD9" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Conversion Funnel</h3>
        <div className="flex gap-1 items-end h-20">
          {funnel.filter((f) => f.count > 0).map((f) => {
            const max = Math.max(...funnel.map((x) => x.count));
            const h = max ? Math.max(8, Math.round((f.count / max) * 80)) : 8;
            return (
              <div key={f.stage} className="flex flex-col items-center flex-1 gap-1">
                <p className="text-xs text-gray-400">{f.count}</p>
                <div style={{ height: h }} className="w-full rounded-t-sm" style={{ height: h, backgroundColor: STAGE_COLORS[f.stage] || '#3B82F6' }} />
                <p className="text-[10px] text-gray-600 truncate w-full text-center">{f.stage}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* BDE Performance Table */}
      {bdes.length > 0 && (
        <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1A3A6B]">
            <h3 className="text-sm font-semibold text-white">BDE Performance</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-[#1A3A6B]">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-right px-4 py-3">Assigned</th>
                <th className="text-right px-4 py-3">Active</th>
                <th className="text-right px-4 py-3">Won</th>
                <th className="text-right px-4 py-3">Lost</th>
                <th className="text-right px-4 py-3">Win Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A3A6B]/40">
              {bdes.map((b) => (
                <tr key={b._id} className="hover:bg-[#1A3A6B]/10">
                  <td className="px-4 py-3 text-white">{b.name || 'Unknown'}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{b.total}</td>
                  <td className="px-4 py-3 text-right text-blue-400">{b.active}</td>
                  <td className="px-4 py-3 text-right text-green-400">{b.won}</td>
                  <td className="px-4 py-3 text-right text-red-400">{b.lost}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${b.winRate >= 30 ? 'text-green-400' : b.winRate >= 15 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {Math.round(b.winRate)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
