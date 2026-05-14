import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { dmAuditApi } from '../../../api/dmAudit.api';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Download } from 'lucide-react';

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const TrendIcon = ({ trend, delta }) => {
  if (trend === 'up')   return <span className="flex items-center gap-0.5 text-green-400 text-xs"><TrendingUp size={12} />+{delta}</span>;
  if (trend === 'down') return <span className="flex items-center gap-0.5 text-red-400 text-xs"><TrendingDown size={12} />{delta}</span>;
  return <span className="flex items-center gap-0.5 text-gray-500 text-xs"><Minus size={12} />—</span>;
};

export default function DMAuditComparePage() {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const r1Id = params.get('r1');
  const r2Id = params.get('r2');

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!r1Id || !r2Id) return;
    (async () => {
      setLoading(true);
      try {
        const r = await dmAuditApi.compareReports(r1Id, r2Id);
        setData(r.data.data);
      } catch {} finally { setLoading(false); }
    })();
  }, [r1Id, r2Id]);

  const exportPDF = async (id, label) => {
    const r = await dmAuditApi.exportPDF(id);
    downloadBlob(r.data, `audit-compare-${label}.pdf`);
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading comparison...</div>;
  if (!data)   return <div className="flex items-center justify-center h-64 text-gray-400">Could not load reports.</div>;

  const { report1, report2, comparison } = data;

  const improved  = comparison.filter((c) => c.trend === 'up').length;
  const declined  = comparison.filter((c) => c.trend === 'down').length;
  const unchanged = comparison.filter((c) => c.trend === 'flat' || !c.trend).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/dm/audit-reports')} className="p-2 text-gray-400 hover:text-white border border-[#1A3A6B] rounded-lg mt-0.5">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Period Comparison</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {report1?.client?.companyName || report1?.client?.name} · {report1?.platform?.name}
          </p>
        </div>
      </div>

      {/* Period Headers */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#1A3A6B]/30 border border-[#1A3A6B] rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Period 1 (Base)</p>
          <p className="text-white font-semibold">{report1?.periodDays}-day</p>
          <p className="text-xs text-gray-500">{new Date(report1?.startDate).toLocaleDateString('en-IN')} – {new Date(report1?.endDate).toLocaleDateString('en-IN')}</p>
          <button onClick={() => exportPDF(r1Id, 'period1')} className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-white">
            <Download size={11} /> PDF
          </button>
        </div>
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="text-xs text-gray-500 flex gap-4">
            <span className="text-green-400">↑ {improved} improved</span>
            <span className="text-red-400">↓ {declined} declined</span>
          </div>
          <div className="text-xs text-gray-600">{unchanged} unchanged</div>
        </div>
        <div className="bg-[#1E6FD9]/10 border border-[#1E6FD9]/40 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Period 2 (Current)</p>
          <p className="text-white font-semibold">{report2?.periodDays}-day</p>
          <p className="text-xs text-gray-500">{new Date(report2?.startDate).toLocaleDateString('en-IN')} – {new Date(report2?.endDate).toLocaleDateString('en-IN')}</p>
          <button onClick={() => exportPDF(r2Id, 'period2')} className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-white">
            <Download size={11} /> PDF
          </button>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-[#1A3A6B] bg-[#1A3A6B]/20">
              <th className="text-left px-4 py-3">Metric</th>
              <th className="text-right px-4 py-3 text-gray-500">Period 1</th>
              <th className="text-right px-4 py-3 text-[#1E6FD9]">Period 2</th>
              <th className="text-right px-4 py-3">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A3A6B]/30">
            {comparison.map((row, i) => {
              const isBlank = row.r1 === null && row.r2 === null;
              return (
                <tr key={i} className={`hover:bg-[#1A3A6B]/10 ${isBlank ? 'opacity-40' : ''}`}>
                  <td className="px-4 py-2.5 text-gray-300">{row.metric?.title || '—'}</td>
                  <td className="px-4 py-2.5 text-right text-gray-400">{row.r1 ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right text-white font-medium">{row.r2 ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right">
                    {row.trend ? <TrendIcon trend={row.trend} delta={row.delta > 0 ? row.delta : Math.abs(row.delta)} /> : <span className="text-gray-700 text-xs">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
