import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dmApi } from '../../../api/dm.api';
import { clientsApi } from '../../../api/clients.api';
import api from '../../../api/axios';
import { ArrowLeft, Plus, Trash2, Users, Calendar, CheckCircle2, XCircle } from 'lucide-react';

export default function ClientDMSetupPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();

  const [client,    setClient]    = useState(null);
  const [mappings,  setMappings]  = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [adding,    setAdding]    = useState(false);
  const [formOpen,  setFormOpen]  = useState(false);
  const [form, setForm] = useState({ platformId: '', assignedTo: [], startDate: '', notes: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [cr, mr, pr, ur] = await Promise.all([
        clientsApi.get(clientId),
        dmApi.getClientPlatforms(clientId),
        dmApi.listPlatforms(),
        api.get('/users', { params: { limit: 100 } }),
      ]);
      setClient(cr.data.data.client);
      setMappings(mr.data.data.mappings);
      setPlatforms(pr.data.data.platforms.filter((p) => p.isActive));
      setUsers(ur.data.data.users || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [clientId]);

  const activePlatformIds = new Set(mappings.map((m) => m.platform._id));
  const availablePlatforms = platforms.filter((p) => !activePlatformIds.has(p._id));

  const addPlatform = async () => {
    if (!form.platformId) return;
    setAdding(true);
    try {
      await dmApi.addClientPlatform(clientId, {
        platformId: form.platformId,
        assignedTo: form.assignedTo,
        startDate: form.startDate || undefined,
        notes: form.notes,
      });
      setFormOpen(false);
      setForm({ platformId: '', assignedTo: [], startDate: '', notes: '' });
      load();
    } catch {} finally { setAdding(false); }
  };

  const removePlatform = async (mapping) => {
    if (!window.confirm(`Remove "${mapping.platform.name}" from this client?`)) return;
    await dmApi.removeClientPlatform(clientId, mapping._id);
    load();
  };

  const toggleActive = async (mapping) => {
    await dmApi.updateClientPlatform(clientId, mapping._id, { isActive: !mapping.isActive });
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-400 hover:text-white border border-[#1A3A6B] rounded-lg mt-0.5">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">DM Platform Setup</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {client?.companyName || client?.name} — assign platforms and DM executives
          </p>
        </div>
        {availablePlatforms.length > 0 && (
          <button
            onClick={() => { setFormOpen(true); setForm({ platformId: '', assignedTo: [], startDate: '', notes: '' }); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#1E6FD9] hover:bg-blue-600 text-white text-sm rounded-lg"
          >
            <Plus size={15} /> Add Platform
          </button>
        )}
      </div>

      {/* Add Platform Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl p-6 max-w-md w-full mx-4 space-y-4">
            <h3 className="text-white font-bold">Add Platform for {client?.name}</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Platform *</label>
                <select value={form.platformId} onChange={(e) => setForm((f) => ({ ...f, platformId: e.target.value }))}
                  className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-sm text-white">
                  <option value="">Select platform...</option>
                  {availablePlatforms.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Assigned DM Executives</label>
                <div className="border border-[#1A3A6B] rounded-lg p-2 max-h-36 overflow-y-auto space-y-1">
                  {users.filter((u) => ['TEAM_MEMBER', 'DEPT_HEAD', 'SUBADMIN'].includes(u.role)).map((u) => (
                    <label key={u._id} className="flex items-center gap-2 cursor-pointer px-2 py-1 hover:bg-[#1A3A6B]/30 rounded">
                      <input
                        type="checkbox"
                        checked={form.assignedTo.includes(u._id)}
                        onChange={(e) => {
                          setForm((f) => ({
                            ...f,
                            assignedTo: e.target.checked
                              ? [...f.assignedTo, u._id]
                              : f.assignedTo.filter((id) => id !== u._id),
                          }));
                        }}
                        className="accent-[#1E6FD9]"
                      />
                      <span className="text-sm text-gray-300">{u.name}</span>
                      <span className="text-xs text-gray-500 ml-auto">{u.role}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Start Date</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-sm text-white" />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Notes (optional)</label>
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Any specific notes for this client-platform..."
                  className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none resize-none" />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setFormOpen(false)} className="px-4 py-2 text-sm text-gray-400 border border-[#1A3A6B] rounded-lg hover:text-white">Cancel</button>
              <button onClick={addPlatform} disabled={adding || !form.platformId}
                className="px-4 py-2 text-sm bg-[#1E6FD9] hover:bg-blue-600 text-white rounded-lg disabled:opacity-50">
                {adding ? 'Adding...' : 'Add Platform'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mappings List */}
      {mappings.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-500 border border-[#1A3A6B] rounded-xl gap-2">
          <p className="text-sm">No platforms assigned yet.</p>
          <p className="text-xs">Click "Add Platform" to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mappings.map((m) => (
            <div key={m._id} className={`bg-[#0A1628] border rounded-xl p-5 space-y-3 ${m.isActive ? 'border-[#1A3A6B]' : 'border-gray-700 opacity-60'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${m.isActive ? 'bg-green-400' : 'bg-gray-500'}`} />
                  <h3 className="text-white font-semibold">{m.platform.name}</h3>
                  <span className="text-xs text-gray-500 bg-[#1A3A6B] px-1.5 py-0.5 rounded">{m.platform.code}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => toggleActive(m)} title={m.isActive ? 'Deactivate' : 'Activate'}
                    className="p-1.5 text-gray-500 hover:text-white border border-[#1A3A6B] rounded-lg">
                    {m.isActive ? <CheckCircle2 size={14} className="text-green-400" /> : <XCircle size={14} />}
                  </button>
                  <button onClick={() => removePlatform(m)}
                    className="p-1.5 text-gray-500 hover:text-red-400 border border-[#1A3A6B] rounded-lg">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {m.assignedTo?.length > 0 && (
                <div className="flex items-start gap-2">
                  <Users size={13} className="text-gray-500 mt-0.5 shrink-0" />
                  <div className="flex flex-wrap gap-1">
                    {m.assignedTo.map((u) => (
                      <span key={u._id} className="text-xs bg-[#1A3A6B] text-gray-300 px-2 py-0.5 rounded-full">{u.name}</span>
                    ))}
                  </div>
                </div>
              )}

              {m.startDate && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar size={12} />
                  Started {new Date(m.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              )}

              {m.notes && <p className="text-xs text-gray-400 border-t border-[#1A3A6B] pt-2">{m.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {availablePlatforms.length === 0 && mappings.length > 0 && (
        <p className="text-xs text-gray-500 text-center">All active platforms have been assigned to this client.</p>
      )}
    </div>
  );
}
