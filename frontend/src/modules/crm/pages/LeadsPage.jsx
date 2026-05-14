import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector }         from 'react-redux';
import { useNavigate }                      from 'react-router-dom';
import {
  Plus, Upload, Search, Filter, RefreshCw, Trash2,
  ChevronLeft, ChevronRight, LayoutGrid, List, UserCheck,
} from 'lucide-react';
import {
  fetchLeads, fetchSources, createLead, updateLead, deleteLead, fetchStats,
} from '../../../store/leadsSlice';
import LeadFormModal    from '../components/LeadFormModal';
import BulkImportModal  from '../components/BulkImportModal';
import KanbanBoard      from '../components/KanbanBoard';
import ReassignModal    from '../components/ReassignModal';
import LeadScoreBadge   from '../components/LeadScoreBadge';
import StaleIndicator   from '../components/StaleIndicator';

const STAGES    = ['new', 'assigned', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'junk'];
const PRIORITIES = ['low', 'medium', 'high'];

const STAGE_COLORS = {
  new: 'bg-gray-700 text-gray-200', assigned: 'bg-blue-900 text-blue-200',
  contacted: 'bg-indigo-900 text-indigo-200', qualified: 'bg-cyan-900 text-cyan-200',
  proposal: 'bg-purple-900 text-purple-200', negotiation: 'bg-yellow-900 text-yellow-200',
  won: 'bg-green-900 text-green-200', lost: 'bg-red-900 text-red-200', junk: 'bg-gray-800 text-gray-400',
};

export default function LeadsPage() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { items: leads, total, loading, saving, sources, stats } = useSelector((s) => s.leads);

  const [view,    setView]    = useState('list');   // 'list' | 'kanban'
  const [page,    setPage]    = useState(1);
  const [search,  setSearch]  = useState('');
  const [filters, setFilters] = useState({ stage: '', source: '', priority: '' });
  const [showFilters, setShowFilters] = useState(false);

  const [formOpen,    setFormOpen]    = useState(false);
  const [editLead,    setEditLead]    = useState(null);
  const [importOpen,  setImportOpen]  = useState(false);
  const [deleteId,    setDeleteId]    = useState(null);
  const [reassignLead, setReassignLead] = useState(null);

  const LIMIT = view === 'kanban' ? 200 : 20;

  const loadLeads = useCallback(() => {
    const params = { page, limit: LIMIT, sort: '-createdAt' };
    if (search)           params.q        = search;
    if (filters.stage)    params.stage    = filters.stage;
    if (filters.source)   params.source   = filters.source;
    if (filters.priority) params.priority = filters.priority;
    dispatch(fetchLeads(params));
  }, [dispatch, page, search, filters, LIMIT]);

  useEffect(() => { dispatch(fetchSources()); dispatch(fetchStats()); }, [dispatch]);
  useEffect(() => { loadLeads(); }, [loadLeads]);

  const handleCreate = async (data) => {
    const res = await dispatch(createLead(data));
    if (!res.error) { setFormOpen(false); loadLeads(); dispatch(fetchStats()); }
    return res;
  };

  const handleUpdate = async (data) => {
    const res = await dispatch(updateLead({ id: editLead._id, data }));
    if (!res.error) { setFormOpen(false); setEditLead(null); loadLeads(); }
    return res;
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await dispatch(deleteLead(deleteId));
    setDeleteId(null);
    loadLeads();
    dispatch(fetchStats());
  };

  const openEdit = (lead, e) => {
    e?.stopPropagation();
    setEditLead({ ...lead, source: lead.source?._id || lead.source });
    setFormOpen(true);
  };

  const pages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="text-gray-400 text-sm mt-0.5">{total} total leads</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setImportOpen(true)} className="flex items-center gap-2 px-3 py-2 text-sm border border-[#1A3A6B] text-gray-300 hover:text-white rounded-lg">
            <Upload size={14} /> Bulk Import
          </button>
          <button onClick={() => { setEditLead(null); setFormOpen(true); }} className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1E6FD9] hover:bg-blue-600 text-white rounded-lg">
            <Plus size={14} /> New Lead
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',      value: stats.totalLeads,     color: 'text-white' },
            { label: 'This Month', value: stats.totalThisMonth, color: 'text-[#00C6FF]' },
            { label: 'Won',        value: stats.stageStats?.find((s) => s._id === 'won')?.count || 0, color: 'text-green-400' },
            { label: 'Pipeline',   value: stats.stageStats?.filter((s) => !['won','lost','junk'].includes(s._id)).reduce((a, s) => a + s.count, 0) || 0, color: 'text-yellow-400' },
          ].map((s) => (
            <div key={s.label} className="bg-[#1A3A6B]/30 border border-[#1A3A6B] rounded-xl p-4">
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-[#1A3A6B]/20 border border-[#1A3A6B] rounded-xl p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name, mobile, email, company..."
              className="w-full bg-[#0A1628] border border-[#1A3A6B] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#1E6FD9]"
            />
          </div>
          {/* View toggle */}
          <div className="flex border border-[#1A3A6B] rounded-lg overflow-hidden">
            <button onClick={() => setView('list')} className={`px-3 py-2 ${view === 'list' ? 'bg-[#1E6FD9] text-white' : 'text-gray-400 hover:text-white'}`}>
              <List size={14} />
            </button>
            <button onClick={() => setView('kanban')} className={`px-3 py-2 ${view === 'kanban' ? 'bg-[#1E6FD9] text-white' : 'text-gray-400 hover:text-white'}`}>
              <LayoutGrid size={14} />
            </button>
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border ${showFilters ? 'border-[#1E6FD9] text-[#1E6FD9]' : 'border-[#1A3A6B] text-gray-400'}`}>
            <Filter size={13} /> Filters
          </button>
          <button onClick={loadLeads} className="p-2 text-gray-400 hover:text-white border border-[#1A3A6B] rounded-lg">
            <RefreshCw size={14} />
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-3 gap-3">
            <select value={filters.stage} onChange={(e) => { setFilters((f) => ({ ...f, stage: e.target.value })); setPage(1); }} className="bg-[#0A1628] border border-[#1A3A6B] rounded-lg px-3 py-2 text-sm text-white">
              <option value="">All Stages</option>
              {STAGES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <select value={filters.source} onChange={(e) => { setFilters((f) => ({ ...f, source: e.target.value })); setPage(1); }} className="bg-[#0A1628] border border-[#1A3A6B] rounded-lg px-3 py-2 text-sm text-white">
              <option value="">All Sources</option>
              {sources.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <select value={filters.priority} onChange={(e) => { setFilters((f) => ({ ...f, priority: e.target.value })); setPage(1); }} className="bg-[#0A1628] border border-[#1A3A6B] rounded-lg px-3 py-2 text-sm text-white">
              <option value="">All Priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="overflow-x-auto">
          {loading ? (
            <p className="text-center text-gray-400 py-10">Loading leads...</p>
          ) : (
            <KanbanBoard leads={leads} onStageChange={loadLeads} />
          )}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <>
          <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl overflow-hidden">
            {loading ? (
              <div className="text-center py-16 text-gray-400">Loading leads...</div>
            ) : leads.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-400">No leads found</p>
                <button onClick={() => setFormOpen(true)} className="mt-3 text-[#1E6FD9] text-sm hover:underline">+ Add first lead</button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1A3A6B] text-xs text-gray-400 uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Mobile</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Company</th>
                    <th className="text-left px-4 py-3 hidden lg:table-cell">Source</th>
                    <th className="text-left px-4 py-3">Stage</th>
                    <th className="text-left px-4 py-3 hidden lg:table-cell">Score</th>
                    <th className="text-left px-4 py-3 hidden xl:table-cell">Assigned</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A3A6B]/40">
                  {leads.map((lead) => (
                    <tr
                      key={lead._id}
                      onClick={() => navigate(`/crm/leads/${lead._id}`)}
                      className="hover:bg-[#1A3A6B]/20 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <StaleIndicator lead={lead} size={12} />
                          <div>
                            <p className="text-white font-medium">{lead.name}</p>
                            {lead.email && <p className="text-xs text-gray-500">{lead.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{lead.mobile}</td>
                      <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{lead.company || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">{lead.source?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[lead.stage] || 'bg-gray-700 text-gray-200'}`}>
                          {lead.stage}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <LeadScoreBadge score={lead.leadScore} />
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell text-xs text-gray-400">
                        {lead.assignedTo?.name || <span className="text-gray-600">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setReassignLead(lead)} className="p-1.5 text-gray-500 hover:text-[#1E6FD9] rounded" title="Reassign">
                            <UserCheck size={13} />
                          </button>
                          <button onClick={(e) => openEdit(lead, e)} className="p-1.5 text-gray-500 hover:text-white rounded" title="Edit">
                            ✏️
                          </button>
                          <button onClick={() => setDeleteId(lead._id)} className="p-1.5 text-gray-500 hover:text-red-400 rounded" title="Delete">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-400">
              <p>Page {page} of {pages} ({total} leads)</p>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="p-2 border border-[#1A3A6B] rounded-lg disabled:opacity-40 hover:text-white">
                  <ChevronLeft size={14} />
                </button>
                <button disabled={page === pages} onClick={() => setPage((p) => p + 1)} className="p-2 border border-[#1A3A6B] rounded-lg disabled:opacity-40 hover:text-white">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <LeadFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditLead(null); }}
        onSubmit={editLead?._id ? handleUpdate : handleCreate}
        initial={editLead}
        saving={saving}
      />

      <BulkImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => { loadLeads(); dispatch(fetchStats()); }}
      />

      <ReassignModal
        open={!!reassignLead}
        lead={reassignLead}
        onClose={() => { setReassignLead(null); loadLeads(); }}
      />

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#0A1628] border border-red-800 rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-white font-bold mb-2">Delete Lead?</h3>
            <p className="text-gray-400 text-sm mb-5">Soft-delete — recoverable from audit trail.</p>
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
