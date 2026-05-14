import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector }         from 'react-redux';
import { useNavigate }                      from 'react-router-dom';
import { Plus, Search, RefreshCw, ChevronLeft, ChevronRight, Trash2, Building2 } from 'lucide-react';
import { fetchClients, createClient, deleteClient } from '../../../store/clientsSlice';
import ClientFormModal from '../components/ClientFormModal';

const HEALTH_CONFIG = {
  green:  { label: 'Healthy',  dot: 'bg-green-500',  text: 'text-green-400' },
  yellow: { label: 'At Risk',  dot: 'bg-yellow-500', text: 'text-yellow-400' },
  red:    { label: 'Critical', dot: 'bg-red-500',    text: 'text-red-400' },
};

const INDUSTRIES = ['real_estate','education','healthcare','finance','ecommerce','hospitality','manufacturing','retail','technology','media','other'];

export default function ClientsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items: clients, total, loading, saving } = useSelector((s) => s.clients);

  const [page,     setPage]     = useState(1);
  const [search,   setSearch]   = useState('');
  const [health,   setHealth]   = useState('');
  const [industry, setIndustry] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const LIMIT = 20;

  const load = useCallback(() => {
    const params = { page, limit: LIMIT, sort: '-createdAt' };
    if (search)   params.q           = search;
    if (health)   params.healthScore = health;
    if (industry) params.industry    = industry;
    dispatch(fetchClients(params));
  }, [dispatch, page, search, health, industry]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data) => {
    const res = await dispatch(createClient(data));
    if (!res.error) { setFormOpen(false); load(); }
    return res;
  };

  const handleDelete = async () => {
    await dispatch(deleteClient(deleteId));
    setDeleteId(null); load();
  };

  const pages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clients</h1>
          <p className="text-gray-400 text-sm mt-0.5">{total} total clients</p>
        </div>
        <button onClick={() => setFormOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1E6FD9] hover:bg-blue-600 text-white rounded-lg">
          <Plus size={14} /> New Client
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search client, company, mobile..." className="w-full bg-[#0A1628] border border-[#1A3A6B] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#1E6FD9]" />
        </div>
        <select value={health} onChange={(e) => { setHealth(e.target.value); setPage(1); }} className="bg-[#0A1628] border border-[#1A3A6B] rounded-lg px-3 py-2 text-sm text-white">
          <option value="">All Health</option>
          <option value="green">Healthy</option>
          <option value="yellow">At Risk</option>
          <option value="red">Critical</option>
        </select>
        <select value={industry} onChange={(e) => { setIndustry(e.target.value); setPage(1); }} className="bg-[#0A1628] border border-[#1A3A6B] rounded-lg px-3 py-2 text-sm text-white">
          <option value="">All Industries</option>
          {INDUSTRIES.map((i) => <option key={i} value={i}>{i.replace(/_/g, ' ')}</option>)}
        </select>
        <button onClick={load} className="p-2 text-gray-400 hover:text-white border border-[#1A3A6B] rounded-lg"><RefreshCw size={14} /></button>
      </div>

      {/* Table */}
      <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl overflow-hidden">
        {loading ? (
          <p className="text-center py-16 text-gray-400">Loading clients...</p>
        ) : clients.length === 0 ? (
          <div className="text-center py-16">
            <Building2 size={32} className="mx-auto text-gray-700 mb-3" />
            <p className="text-gray-400">No clients yet</p>
            <p className="text-gray-600 text-sm mt-1">Clients are created when a lead is marked as Won</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1A3A6B] text-xs text-gray-400 uppercase tracking-wider">
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Mobile</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Industry</th>
                <th className="text-left px-4 py-3">Health</th>
                <th className="text-left px-4 py-3 hidden xl:table-cell">Account Manager</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Onboarded</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A3A6B]/40">
              {clients.map((c) => {
                const hcfg = HEALTH_CONFIG[c.healthScore] || HEALTH_CONFIG.green;
                return (
                  <tr key={c._id} onClick={() => navigate(`/crm/clients/${c._id}`)} className="hover:bg-[#1A3A6B]/20 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{c.name}</p>
                      {c.companyName && <p className="text-xs text-gray-500">{c.companyName}</p>}
                      {c.email && <p className="text-xs text-gray-600">{c.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-300 hidden md:table-cell">{c.mobile || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 hidden lg:table-cell capitalize">{c.industry?.replace(/_/g, ' ') || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${hcfg.text}`}>
                        <span className={`w-2 h-2 rounded-full ${hcfg.dot}`} />
                        {hcfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 hidden xl:table-cell">{c.accountManager?.name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell">
                      {c.onboardingDate ? new Date(c.onboardingDate).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setDeleteId(c._id)} className="p-1.5 text-gray-500 hover:text-red-400 rounded">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <p>Page {page} of {pages}</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="p-2 border border-[#1A3A6B] rounded-lg disabled:opacity-40 hover:text-white"><ChevronLeft size={14} /></button>
            <button disabled={page === pages} onClick={() => setPage((p) => p + 1)} className="p-2 border border-[#1A3A6B] rounded-lg disabled:opacity-40 hover:text-white"><ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      <ClientFormModal open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleCreate} saving={saving} />

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#0A1628] border border-red-800 rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-white font-bold mb-2">Delete Client?</h3>
            <p className="text-gray-400 text-sm mb-5">This is a soft delete — data will be retained for audit purposes.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-gray-400 border border-[#1A3A6B] rounded-lg hover:text-white">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-700 hover:bg-red-600 text-white rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
