import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { crmApi } from '../../../api/crm.api';
import { Download, RefreshCw, Filter } from 'lucide-react';

const STAGE_COLORS = {
  new: '#6B7280', assigned: '#3B82F6', contacted: '#6366F1',
  qualified: '#06B6D4', proposal: '#A855F7', negotiation: '#EAB308',
  won: '#22C55E', lost: '#EF4444', junk: '#374151',
};

const PIE_COLORS = ['#1E6FD9', '#00C6FF', '#A855F7', '#22C55E', '#EAB308', '#EF4444', '#6366F1', '#F97316'];

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export default function CRMReportsPage() {
  const [funnel,   setFunnel]   = useState([]);
  const [sources,  setSources]  = useState([]);
  const [bdes,     setBdes]     = useState([]);
  const [winLoss,  setWinLoss]  = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [f, src, b, wl, p] = await Promise.all([
        crmApi.funnel(),
        crmApi.sources(),
        crmApi.bdePerf(),
        crmApi.winLoss(),
        crmApi.pipeline(),
      ]);
      setFunnel(f.data.data.funnel);
      setSources(src.data.data.sources);
      setBdes(b.data.data.bdes);
      setWinLoss(wl.data.data.reasons || []);
      setPipeline(p.data.data.pipeline);
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

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading reports...</div>;

  const maxFunnelCount = Math.max(...funnel.map((f) => f.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">CRM Reports</h1>
          <p className="text-gray-400 text-sm mt-0.5">Pipeline analytics and team performance</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportLeads} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-[#1A3A6B] text-gray-300 hover:text-white rounded-lg">
            <Download size={13} /> Leads CSV
          </button>
          <button onClick={exportClients} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-[#1A3A6B] text-gray-300 hover:text-white rounded-lg">
            <Download size={13} /> Clients CSV
          </button>
          <button onClick={load} className="p-2 text-gray-400 hover:text-white border border-[#1A3A6B] rounded-lg">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Row 1: Funnel + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Conversion Funnel */}
        <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-5">Conversion Funnel</h3>
          <div className="space-y-2">
            {funnel.filter((f) => f.count > 0).map((f) => {
              const pct = Math.round((f.count / maxFunnelCount) * 100);
              return (
                <div key={f.stage} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-24 shrink-0 capitalize">{f.stage}</span>
                  <div className="flex-1 h-5 bg-[#1A3A6B]/30 rounded overflow-hidden">
                    <div
                      className="h-full rounded transition-all"
                      style={{ width: `${pct}%`, backgroundColor: STAGE_COLORS[f.stage] || '#3B82F6' }}
                    />
                  </div>
                  <span className="text-xs text-gray-300 w-8 text-right">{f.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pipeline by Stage */}
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
      </div>

      {/* Row 2: Source Quality + Win/Loss */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Lead Sources */}
        <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Lead Sources</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sources.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A3A6B" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <YAxis type="category" dataKey="source" tick={{ fontSize: 10, fill: '#9CA3AF' }} width={100} />
              <Tooltip contentStyle={{ backgroundColor: '#0A1628', border: '1px solid #1A3A6B', borderRadius: 8 }} />
              <Bar dataKey="total" fill="#1E6FD9" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Win/Loss Reasons */}
        <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Win/Loss Breakdown</h3>
          {winLoss.length === 0 ? (
            <p className="text-gray-500 text-sm">No win/loss data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={winLoss}
                  dataKey="count"
                  nameKey="_id"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ _id, percent }) => `${_id || 'Other'} (${Math.round(percent * 100)}%)`}
                  labelLine={false}
                >
                  {winLoss.map((entry, i) => (
                    <Cell key={entry._id || i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0A1628', border: '1px solid #1A3A6B', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
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
                <th className="text-right px-4 py-3">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A3A6B]/40">
              {bdes.map((b) => {
                const conversion = b.total > 0 ? Math.round(((b.won + b.lost) / b.total) * 100) : 0;
                return (
                  <tr key={b._id} className="hover:bg-[#1A3A6B]/10">
                    <td className="px-4 py-3 text-white font-medium">{b.name || 'Unknown'}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{b.total}</td>
                    <td className="px-4 py-3 text-right text-blue-400">{b.active}</td>
                    <td className="px-4 py-3 text-right text-green-400">{b.won}</td>
                    <td className="px-4 py-3 text-right text-red-400">{b.lost}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${b.winRate >= 30 ? 'text-green-400' : b.winRate >= 15 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {Math.round(b.winRate)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">{conversion}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Source Quality Table */}
      {sources.length > 0 && (
        <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1A3A6B]">
            <h3 className="text-sm font-semibold text-white">Source Quality Analysis</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-[#1A3A6B]">
                <th className="text-left px-4 py-3">Source</th>
                <th className="text-right px-4 py-3">Total Leads</th>
                <th className="text-right px-4 py-3">Won</th>
                <th className="text-right px-4 py-3">Lost</th>
                <th className="text-right px-4 py-3">Win Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A3A6B]/40">
              {sources.map((s) => {
                const winRate = s.won > 0 ? Math.round((s.won / s.total) * 100) : 0;
                return (
                  <tr key={s.source} className="hover:bg-[#1A3A6B]/10">
                    <td className="px-4 py-3 text-white">{s.source || '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{s.total}</td>
                    <td className="px-4 py-3 text-right text-green-400">{s.won || 0}</td>
                    <td className="px-4 py-3 text-right text-red-400">{s.lost || 0}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${winRate >= 30 ? 'text-green-400' : winRate >= 15 ? 'text-yellow-400' : 'text-gray-400'}`}>
                        {winRate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
