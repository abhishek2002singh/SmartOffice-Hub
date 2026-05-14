import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dmAuditApi } from '../../../api/dmAudit.api';
import { dmApi } from '../../../api/dm.api';
import { useSelector } from 'react-redux';
import { clientsApi } from '../../../api/clients.api';
import {
  Plus, Download, GitCompare, Eye, Trash2, RefreshCw,
  FileText, CheckCircle, Clock, Filter,
} from 'lucide-react';

const PERIODS = [7, 15, 30, 60, 90];
const STATUS_CONFIG = {
  draft:     { label: 'Draft',     cls: 'bg-yellow-900/30 text-yellow-400 border-yellow-700' },
  published: { label: 'Published', cls: 'bg-green-900/30 text-green-400 border-green-700' },
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export default function DMAuditReportsPage() {
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);

  const [reports,   setReports]   = useState([]);
  const [clients,   setClients]   = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [genOpen,   setGenOpen]   = useState(false);
  const [genForm,   setGenForm]   = useState({ clientId: '', platformId: '', periodDays: 30, startDate: '' });
  const [generating, setGenerating] = useState(false);

  // Compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [selected,    setSelected]    = useState([]);

  // Filters
  const [filterClient,   setFilterClient]   = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterClient)   params.clientId   = filterClient;
      if (filterPlatform) params.platformId = filterPlatform;
      if (filterStatus)   params.status     = filterStatus;

      const [rr, cr, pr] = await Promise.all([
        dmAuditApi.listReports(params),
        clientsApi.list({ limit: 200 }),
        dmApi.listPlatforms(),
      ]);
      setReports(rr.data.data.reports);
      setClients(cr.data.data.clients || []);
      setPlatforms(pr.data.data.platforms.filter((p) => p.isActive));
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterClient, filterPlatform, filterStatus]);

  const generateReport = async () => {
    if (!genForm.clientId || !genForm.platformId || !genForm.startDate) return;
    setGenerating(true);
    try {
      const r = await dmAuditApi.generateReport(genForm);
      setGenOpen(false);
      navigate(`/dm/audit-reports/${r.data.data.report._id}/fill`);
    } catch {} finally { setGenerating(false); }
  };

  const deleteReport = async (id) => {
    if (!window.confirm('Delete this report?')) return;
    await dmAuditApi.deleteReport(id);
    load();
  };

  const exportPDF = async (report) => {
    const r = await dmAuditApi.exportPDF(report._id);
    downloadBlob(r.data, `audit-${report.client?.name}-${report.platform?.name}-${report.periodDays}d.pdf`);
  };

  const toggleSelect = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : [prev[1], id]);
  };

  const goCompare = () => {
    if (selected.length === 2) navigate(`/dm/audit-reports/compare?r1=${selected[0]}&r2=${selected[1]}`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">DM Audit Reports</h1>
          <p className="text-gray-400 text-sm mt-0.5">Performance reports — 7/15/30/60/90 day periods</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setCompareMode(!compareMode); setSelected([]); }}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border ${compareMode ? 'bg-purple-900/30 border-purple-700 text-purple-300' : 'border-[#1A3A6B] text-gray-300 hover:text-white'}`}
          >
            <GitCompare size={14} /> {compareMode ? 'Exit Compare' : 'Compare'}
          </button>
          {compareMode && selected.length === 2 && (
            <button onClick={goCompare} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-purple-700 hover:bg-purple-600 text-white rounded-lg">
              Compare Selected
            </button>
          )}
          <button onClick={() => setGenOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-[#1E6FD9] hover:bg-blue-600 text-white text-sm rounded-lg">
            <Plus size={15} /> New Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}
          className="bg-[#0A1628] border border-[#1A3A6B] rounded-lg px-3 py-2 text-sm text-white">
          <option value="">All Clients</option>
          {clients.map((c) => <option key={c._id} value={c._id}>{c.companyName || c.name}</option>)}
        </select>
        <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}
          className="bg-[#0A1628] border border-[#1A3A6B] rounded-lg px-3 py-2 text-sm text-white">
          <option value="">All Platforms</option>
          {platforms.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-[#0A1628] border border-[#1A3A6B] rounded-lg px-3 py-2 text-sm text-white">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <button onClick={load} className="p-2 text-gray-400 hover:text-white border border-[#1A3A6B] rounded-lg"><RefreshCw size={14} /></button>
      </div>

      {compareMode && (
        <div className="bg-purple-900/20 border border-purple-700 rounded-xl px-4 py-3 text-sm text-purple-300">
          Select 2 reports to compare. Selected: {selected.length}/2
        </div>
      )}

      {/* Generate Report Modal */}
      {genOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl p-6 max-w-md w-full mx-4 space-y-4">
            <h3 className="text-white font-bold">Generate New Audit Report</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Client *</label>
                <select value={genForm.clientId} onChange={(e) => setGenForm((f) => ({ ...f, clientId: e.target.value }))}
                  className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-sm text-white">
                  <option value="">Select client...</option>
                  {clients.map((c) => <option key={c._id} value={c._id}>{c.companyName || c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Platform *</label>
                <select value={genForm.platformId} onChange={(e) => setGenForm((f) => ({ ...f, platformId: e.target.value }))}
                  className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-sm text-white">
                  <option value="">Select platform...</option>
                  {platforms.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Report Period *</label>
                <div className="flex gap-2">
                  {PERIODS.map((d) => (
                    <button key={d} onClick={() => setGenForm((f) => ({ ...f, periodDays: d }))}
                      className={`flex-1 py-1.5 text-sm rounded-lg border ${genForm.periodDays === d ? 'bg-[#1E6FD9] border-[#1E6FD9] text-white' : 'border-[#1A3A6B] text-gray-400'}`}>
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Period Start Date *</label>
                <input type="date" value={genForm.startDate} onChange={(e) => setGenForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-sm text-white" />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setGenOpen(false)} className="px-4 py-2 text-sm text-gray-400 border border-[#1A3A6B] rounded-lg hover:text-white">Cancel</button>
              <button onClick={generateReport} disabled={generating || !genForm.clientId || !genForm.platformId || !genForm.startDate}
                className="px-4 py-2 text-sm bg-[#1E6FD9] hover:bg-blue-600 text-white rounded-lg disabled:opacity-50">
                {generating ? 'Generating...' : 'Generate & Fill'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reports List */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-500 border border-[#1A3A6B] rounded-xl gap-2">
          <FileText size={32} className="text-gray-700" />
          <p className="text-sm">No audit reports yet. Generate your first report.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.draft;
            const isSelected = selected.includes(r._id);
            return (
              <div key={r._id}
                className={`bg-[#0A1628] border rounded-xl p-4 flex items-center gap-4 ${compareMode && isSelected ? 'border-purple-600 bg-purple-900/10' : 'border-[#1A3A6B]'}`}
                onClick={() => compareMode && toggleSelect(r._id)}
                style={{ cursor: compareMode ? 'pointer' : 'default' }}
              >
                {compareMode && (
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-purple-500 bg-purple-500' : 'border-gray-600'}`}>
                    {isSelected && <span className="text-white text-xs">✓</span>}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium">{r.client?.companyName || r.client?.name}</span>
                    <span className="text-xs text-gray-500">—</span>
                    <span className="text-gray-300 text-sm">{r.platform?.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${sc.cls}`}>{sc.label}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {r.periodDays}-day period · {new Date(r.startDate).toLocaleDateString('en-IN')} – {new Date(r.endDate).toLocaleDateString('en-IN')}
                    {' · '}by {r.generatedBy?.name}
                    {' · '}{new Date(r.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
                {!compareMode && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => navigate(`/dm/audit-reports/${r._id}/fill`)}
                      className="p-2 text-gray-400 hover:text-white border border-[#1A3A6B] rounded-lg" title="Fill / View">
                      <Eye size={14} />
                    </button>
                    <button onClick={() => exportPDF(r)}
                      className="p-2 text-gray-400 hover:text-[#00C6FF] border border-[#1A3A6B] rounded-lg" title="Download PDF">
                      <Download size={14} />
                    </button>
                    <button onClick={() => deleteReport(r._id)}
                      className="p-2 text-gray-400 hover:text-red-400 border border-[#1A3A6B] rounded-lg" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
