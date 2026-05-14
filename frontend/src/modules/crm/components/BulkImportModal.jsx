import { useState, useRef } from 'react';
import { useSelector }      from 'react-redux';
import { X, Upload, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { leadsApi } from '../../../api/leads.api';

export default function BulkImportModal({ open, onClose, onSuccess }) {
  const sources  = useSelector((s) => s.leads.sources);
  const [sourceId, setSourceId] = useState('');
  const [file,     setFile]     = useState(null);
  const [rows,     setRows]     = useState([]);
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const fileRef = useRef();

  if (!open) return null;

  const handleClose = () => {
    setFile(null); setRows([]); setResult(null); setError(''); setSourceId('');
    onClose();
  };

  const downloadTemplate = async () => {
    const res = await leadsApi.downloadTemplate();
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a'); a.href = url; a.download = 'lead_import_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const vals = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      return headers.reduce((acc, h, i) => { acc[h] = vals[i] || ''; return acc; }, {});
    });
  };

  const onFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      setRows(parsed);
      setError('');
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!sourceId) { setError('Please select a source'); return; }
    if (!rows.length) { setError('No rows to import'); return; }
    setLoading(true); setError('');
    try {
      const res = await leadsApi.bulkImport({ rows, sourceId });
      setResult(res.data.data);
      onSuccess?.();
    } catch (e) {
      setError(e.response?.data?.error?.message || 'Import failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-[#1A3A6B]">
          <h2 className="text-lg font-bold text-white">Bulk Import Leads</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-5">
          {!result ? (
            <>
              <button onClick={downloadTemplate} className="flex items-center gap-2 text-sm text-[#00C6FF] hover:underline">
                <Download size={15} /> Download CSV Template
              </button>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Source *</label>
                <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-white text-sm">
                  <option value="">Select source...</option>
                  {sources.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>

              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-[#1A3A6B] hover:border-[#1E6FD9] rounded-xl p-8 text-center cursor-pointer transition-colors"
              >
                <Upload size={32} className="mx-auto mb-2 text-gray-500" />
                {file ? (
                  <p className="text-white text-sm font-medium">{file.name} — {rows.length} rows detected</p>
                ) : (
                  <p className="text-gray-400 text-sm">Click to upload CSV file</p>
                )}
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onFileChange} />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              {rows.length > 0 && (
                <p className="text-gray-400 text-xs">{rows.length} rows ready to import</p>
              )}

              <div className="flex justify-end gap-3">
                <button onClick={handleClose} className="px-4 py-2 text-sm text-gray-400 border border-[#1A3A6B] rounded-lg hover:text-white">Cancel</button>
                <button onClick={handleImport} disabled={loading || !rows.length} className="px-5 py-2 text-sm bg-[#1E6FD9] hover:bg-blue-600 text-white rounded-lg disabled:opacity-50">
                  {loading ? 'Importing...' : 'Import Leads'}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-green-900/20 border border-green-700 rounded-lg p-4">
                <CheckCircle size={20} className="text-green-400 shrink-0" />
                <div>
                  <p className="text-white font-medium">{result.created} leads imported</p>
                  <p className="text-gray-400 text-sm">{result.skipped} duplicates skipped · {result.errors} errors</p>
                </div>
              </div>

              {result.skippedRows?.length > 0 && (
                <div>
                  <p className="text-xs text-yellow-400 mb-2 flex items-center gap-1"><AlertCircle size={12} /> Skipped (duplicates)</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {result.skippedRows.map((r, i) => (
                      <p key={i} className="text-xs text-gray-400">Row {r.row}: {r.mobile} — {r.reason}</p>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={handleClose} className="w-full px-4 py-2 text-sm bg-[#1E6FD9] hover:bg-blue-600 text-white rounded-lg">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
