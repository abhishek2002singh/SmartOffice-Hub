import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dmAuditApi } from '../../../api/dmAudit.api';
import { ArrowLeft, Save, CheckCircle, Download, Send } from 'lucide-react';

const VALUE_TYPE_INPUT = {
  number:     { type: 'number', placeholder: '0' },
  percentage: { type: 'number', placeholder: '0.00', step: '0.01' },
  currency:   { type: 'number', placeholder: '0.00', step: '0.01' },
  text:       { type: 'text',   placeholder: 'Enter value...' },
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export default function DMAuditFillPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [report,  setReport]  = useState(null);
  const [entries, setEntries] = useState([]);
  const [values,  setValues]  = useState({}); // { metricId: { value, notes } }
  const [narrative, setNarrative] = useState({ achievements: '', challenges: '', recommendations: '', nextGoals: '' });
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await dmAuditApi.getReport(id);
      const { report: rp, entries: en } = r.data.data;
      setReport(rp);
      setEntries(en);
      // Initialize values from existing entries
      const vals = {};
      en.forEach((e) => {
        vals[e.metric?._id] = { value: e.value ?? '', notes: e.notes || '' };
      });
      setValues(vals);
      setNarrative({
        achievements:    rp.achievements    || '',
        challenges:      rp.challenges      || '',
        recommendations: rp.recommendations || '',
        nextGoals:       rp.nextGoals       || '',
      });
    } catch {} finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleValueChange = (metricId, field, val) => {
    setValues((prev) => ({ ...prev, [metricId]: { ...prev[metricId], [field]: val } }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const entriesPayload = entries
        .filter((e) => e.metric?._id)
        .map((e) => ({
          metricId: e.metric._id,
          value: values[e.metric._id]?.value ?? null,
          notes: values[e.metric._id]?.notes || '',
        }));
      await dmAuditApi.saveEntries(id, { entries: entriesPayload, ...narrative });
      setLastSaved(new Date());
      setDirty(false);
    } catch {} finally { setSaving(false); }
  };

  const publish = async () => {
    await save();
    setPublishing(true);
    try {
      await dmAuditApi.publishReport(id);
      setReport((prev) => ({ ...prev, status: 'published' }));
    } catch {} finally { setPublishing(false); }
  };

  const exportPDF = async () => {
    const r = await dmAuditApi.exportPDF(id);
    downloadBlob(r.data, `audit-${report?.client?.name}-${report?.platform?.name}-${report?.periodDays}d.pdf`);
  };

  const filledCount = entries.filter((e) => {
    const v = values[e.metric?._id]?.value;
    return v !== '' && v !== null && v !== undefined;
  }).length;
  const pct = entries.length > 0 ? Math.round((filledCount / entries.length) * 100) : 0;

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading report...</div>;
  if (!report) return <div className="flex items-center justify-center h-64 text-gray-400">Report not found.</div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/dm/audit-reports')} className="p-2 text-gray-400 hover:text-white border border-[#1A3A6B] rounded-lg mt-0.5">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">
            {report.client?.companyName || report.client?.name} — {report.platform?.name}
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {report.periodDays}-day report · {new Date(report.startDate).toLocaleDateString('en-IN')} – {new Date(report.endDate).toLocaleDateString('en-IN')}
            {lastSaved && <span className="ml-2 text-green-500 text-xs">Saved {lastSaved.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-[#1A3A6B] text-gray-300 hover:text-white rounded-lg">
            <Download size={14} /> PDF
          </button>
          <button onClick={save} disabled={saving || !dirty}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-[#1A3A6B] text-gray-300 hover:text-white rounded-lg disabled:opacity-40">
            <Save size={14} /> {saving ? 'Saving...' : 'Save Draft'}
          </button>
          {report.status === 'draft' && (
            <button onClick={publish} disabled={publishing}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-green-700 hover:bg-green-600 text-white rounded-lg disabled:opacity-50">
              <Send size={14} /> {publishing ? 'Publishing...' : 'Publish'}
            </button>
          )}
          {report.status === 'published' && (
            <span className="flex items-center gap-1.5 px-3 py-2 text-sm text-green-400 border border-green-700 rounded-lg">
              <CheckCircle size={14} /> Published
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl p-4 flex items-center gap-4">
        <div className="flex-1 h-2 bg-[#1A3A6B] rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-[#1E6FD9] transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-sm text-white font-medium">{filledCount}/{entries.length} filled</span>
        <span className="text-sm font-bold text-[#00C6FF]">{pct}%</span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {entries.map((e) => {
          if (!e.metric) return null;
          const cfg    = VALUE_TYPE_INPUT[e.metric.valueType] || VALUE_TYPE_INPUT.text;
          const val    = values[e.metric._id] ?? { value: '', notes: '' };
          const isFilled = val.value !== '' && val.value !== null && val.value !== undefined;

          return (
            <div key={e._id} className={`bg-[#0A1628] border rounded-xl p-4 space-y-2 ${isFilled ? 'border-[#1E6FD9]/40' : 'border-[#1A3A6B]'}`}>
              <div className="flex items-start justify-between gap-2">
                <label className="text-sm text-gray-300 font-medium leading-snug">{e.metric.title}</label>
                <div className="flex items-center gap-1 shrink-0">
                  {e.metric.unit && <span className="text-xs text-gray-500">{e.metric.unit}</span>}
                  <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${
                    e.metric.valueType === 'number'     ? 'bg-blue-900/30 text-blue-400' :
                    e.metric.valueType === 'percentage' ? 'bg-cyan-900/30 text-cyan-400' :
                    e.metric.valueType === 'currency'   ? 'bg-green-900/30 text-green-400' :
                    'bg-gray-800 text-gray-500'
                  }`}>{e.metric.valueType}</span>
                  {isFilled && <CheckCircle size={14} className="text-green-400" />}
                </div>
              </div>
              <input
                {...cfg}
                value={val.value ?? ''}
                onChange={(ev) => handleValueChange(e.metric._id, 'value', ev.target.value)}
                className="w-full bg-[#1A3A6B]/20 border border-[#1A3A6B] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#1E6FD9]"
                disabled={report.status === 'published'}
              />
            </div>
          );
        })}
      </div>

      {/* Narrative Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { key: 'achievements',    label: '🏆 Key Achievements', color: 'text-green-400' },
          { key: 'challenges',      label: '⚠️ Challenges Faced',  color: 'text-yellow-400' },
          { key: 'recommendations', label: '💡 Recommendations',   color: 'text-[#00C6FF]' },
          { key: 'nextGoals',       label: '🎯 Goals for Next Period', color: 'text-purple-400' },
        ].map(({ key, label, color }) => (
          <div key={key} className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl p-4 space-y-2">
            <label className={`text-sm font-semibold ${color}`}>{label}</label>
            <textarea
              value={narrative[key]}
              onChange={(e) => { setNarrative((prev) => ({ ...prev, [key]: e.target.value })); setDirty(true); }}
              rows={4}
              placeholder={`Write ${label.toLowerCase()}...`}
              disabled={report.status === 'published'}
              className="w-full bg-[#1A3A6B]/20 border border-[#1A3A6B] rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-[#1E6FD9] resize-none"
            />
          </div>
        ))}
      </div>

      {/* Sticky save reminder */}
      {dirty && (
        <div className="fixed bottom-6 right-6 z-40">
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-5 py-3 bg-[#1E6FD9] hover:bg-blue-600 text-white rounded-xl shadow-xl text-sm font-medium">
            <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
