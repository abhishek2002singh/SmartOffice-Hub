import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector }  from 'react-redux';
import { fetchLead, changeStage, clearCurrentLead, updateLead } from '../../../store/leadsSlice';
import { leadsApi } from '../../../api/leads.api';
import { crmApi }   from '../../../api/crm.api';
import {
  ArrowLeft, Phone, Mail, Building2, MapPin, Tag, Calendar, User,
  TrendingUp, MessageSquare, PhoneCall, Video, ChevronDown, Wifi,
} from 'lucide-react';
import LeadFormModal   from '../components/LeadFormModal';
import LeadScoreBadge  from '../components/LeadScoreBadge';
import ReassignModal   from '../components/ReassignModal';

const STAGES = ['new', 'assigned', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'junk'];
const STAGE_COLORS = {
  new: 'bg-gray-700', assigned: 'bg-blue-800', contacted: 'bg-indigo-800',
  qualified: 'bg-cyan-800', proposal: 'bg-purple-800', negotiation: 'bg-yellow-800',
  won: 'bg-green-800', lost: 'bg-red-800', junk: 'bg-gray-800',
};

const ACTIVITY_ICONS = {
  note: MessageSquare, call: PhoneCall, email: Mail, meeting: Video,
  whatsapp: Wifi, stage_change: TrendingUp, assignment: User, system: Tag,
};

const COMM_ICONS = {
  call: PhoneCall, whatsapp: Wifi, sms: MessageSquare,
  email: Mail, note: Tag, meeting: Video,
};

export default function LeadDetailPage() {
  const { id }   = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const lead     = useSelector((s) => s.leads.currentLead);
  const saving   = useSelector((s) => s.leads.saving);
  const sources  = useSelector((s) => s.leads.sources);

  const [timeline,     setTimeline]     = useState([]);
  const [actLoading,   setActLoading]   = useState(false);
  const [stageOpen,    setStageOpen]    = useState(false);
  const [editOpen,     setEditOpen]     = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [activityForm, setActivityForm] = useState({ type: 'note', note: '' });
  const [addingAct,    setAddingAct]    = useState(false);
  const [lostReason,   setLostReason]   = useState('');
  const [pendingStage, setPendingStage] = useState(null);

  useEffect(() => {
    dispatch(fetchLead(id));
    loadTimeline();
    return () => dispatch(clearCurrentLead());
  }, [id]);

  const loadTimeline = async () => {
    setActLoading(true);
    try {
      const res = await crmApi.leadTimeline(id);
      setTimeline(res.data.data.timeline);
    } catch {} finally { setActLoading(false); }
  };

  const handleStageChange = async (stage) => {
    if (stage === 'lost') { setPendingStage(stage); setStageOpen(false); return; }
    await dispatch(changeStage({ id, data: { stage } }));
    setStageOpen(false);
    loadTimeline();
  };

  const confirmLostStage = async () => {
    await dispatch(changeStage({ id, data: { stage: 'lost', lostReason } }));
    setPendingStage(null); setLostReason('');
    loadTimeline();
  };

  const handleAddActivity = async () => {
    if (!activityForm.note.trim()) return;
    setAddingAct(true);
    try {
      const isComm = ['call', 'whatsapp', 'sms', 'email', 'meeting'].includes(activityForm.type);
      if (isComm) {
        await crmApi.logLeadComm(id, { type: activityForm.type, content: activityForm.note, direction: 'out' });
      } else {
        await leadsApi.addActivity(id, activityForm);
      }
      setActivityForm({ type: 'note', note: '' });
      loadTimeline();
    } catch {} finally { setAddingAct(false); }
  };

  const handleEdit = async (data) => {
    await dispatch(updateLead({ id, data }));
    setEditOpen(false);
  };

  if (!lead) return (
    <div className="flex items-center justify-center h-64 text-gray-400">Loading lead...</div>
  );

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/crm/leads')} className="p-2 text-gray-400 hover:text-white border border-[#1A3A6B] rounded-lg mt-0.5">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{lead.name}</h1>
            <LeadScoreBadge score={lead.leadScore} />
            <div className="relative">
              <button
                onClick={() => setStageOpen(!stageOpen)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-white ${STAGE_COLORS[lead.stage] || 'bg-gray-700'}`}
              >
                {lead.stage} <ChevronDown size={12} />
              </button>
              {stageOpen && (
                <div className="absolute left-0 top-full mt-1 z-10 bg-[#0A1628] border border-[#1A3A6B] rounded-lg overflow-hidden shadow-xl">
                  {STAGES.map((s) => (
                    <button key={s} onClick={() => handleStageChange(s)} className={`block w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-[#1A3A6B] ${s === lead.stage ? 'text-white font-medium' : ''}`}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <p className="text-gray-400 text-sm mt-1">{lead.company || 'No company'}{lead.designation ? ` · ${lead.designation}` : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setReassignOpen(true)} className="px-3 py-2 text-sm border border-[#1A3A6B] text-gray-300 hover:text-white rounded-lg">Reassign</button>
          <button onClick={() => setEditOpen(true)} className="px-4 py-2 text-sm border border-[#1A3A6B] text-gray-300 hover:text-white rounded-lg">Edit</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Lead Info */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl p-5 space-y-3">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Contact Info</h3>
            <InfoRow icon={<Phone size={14} />}    label="Mobile"  value={lead.mobile} />
            <InfoRow icon={<Mail size={14} />}     label="Email"   value={lead.email || '—'} />
            <InfoRow icon={<Building2 size={14} />} label="Company" value={lead.company || '—'} />
            <InfoRow icon={<MapPin size={14} />}   label="City"    value={lead.city || '—'} />
          </div>

          <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl p-5 space-y-3">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Lead Details</h3>
            <InfoRow icon={<Tag size={14} />}      label="Source"   value={lead.source?.name || '—'} />
            <InfoRow icon={<TrendingUp size={14} />} label="Priority" value={<PriorityBadge p={lead.priority} />} />
            <InfoRow icon={<User size={14} />}     label="Assigned" value={lead.assignedTo?.name || 'Unassigned'} />
            <InfoRow icon={<Calendar size={14} />} label="Follow-up" value={lead.nextFollowUp ? new Date(lead.nextFollowUp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
            {lead.budget > 0 && <InfoRow icon={<Tag size={14} />} label="Budget" value={`₹${lead.budget.toLocaleString('en-IN')}`} />}
            {lead.leadScore > 0 && <InfoRow icon={<TrendingUp size={14} />} label="Lead Score" value={`${lead.leadScore}/100`} />}
          </div>

          {lead.description && (
            <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl p-5">
              <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Notes</h3>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{lead.description}</p>
            </div>
          )}

          {lead.tags?.length > 0 && (
            <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl p-5">
              <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {lead.tags.map((t) => (
                  <span key={t} className="px-2 py-0.5 bg-[#1A3A6B] text-[#00C6FF] text-xs rounded-full">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Activity Timeline + Add Activity */}
        <div className="lg:col-span-2 space-y-4">
          {/* Add Activity */}
          <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl p-5 space-y-3">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Log Activity</h3>
            <div className="flex gap-2">
              {['note', 'call', 'email', 'meeting', 'whatsapp'].map((t) => (
                <button
                  key={t}
                  onClick={() => setActivityForm((f) => ({ ...f, type: t }))}
                  className={`px-3 py-1 text-xs rounded-lg border ${activityForm.type === t ? 'border-[#1E6FD9] bg-[#1E6FD9]/20 text-[#1E6FD9]' : 'border-[#1A3A6B] text-gray-400'}`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <textarea
              value={activityForm.note}
              onChange={(e) => setActivityForm((f) => ({ ...f, note: e.target.value }))}
              placeholder={`Add a ${activityForm.type} note...`}
              rows={3}
              className="w-full bg-[#1A3A6B]/20 border border-[#1A3A6B] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#1E6FD9] resize-none"
            />
            <div className="flex justify-end">
              <button onClick={handleAddActivity} disabled={addingAct || !activityForm.note.trim()} className="px-4 py-2 text-sm bg-[#1E6FD9] hover:bg-blue-600 text-white rounded-lg disabled:opacity-50">
                {addingAct ? 'Saving...' : 'Log Activity'}
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl p-5">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-4">Activity Timeline</h3>
            {actLoading ? (
              <p className="text-gray-500 text-sm">Loading timeline...</p>
            ) : timeline.length === 0 ? (
              <p className="text-gray-500 text-sm">No activity yet. Log a call or note above.</p>
            ) : (
              <div className="space-y-4">
                {timeline.map((item) => {
                  const isComm = item._source === 'communication';
                  const Icons  = isComm ? COMM_ICONS : ACTIVITY_ICONS;
                  const Icon   = Icons[item.type] || Tag;
                  const text   = isComm ? item.content : (item.note || '');
                  return (
                    <div key={item._id} className="flex gap-3">
                      <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${isComm ? 'bg-purple-900' : 'bg-[#1A3A6B]'}`}>
                        <Icon size={12} className={isComm ? 'text-purple-300' : 'text-[#00C6FF]'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-gray-300 capitalize">{item.type.replace('_', ' ')}</span>
                          {isComm && item.direction && <span className="text-xs text-gray-600 bg-[#1A3A6B] px-1.5 py-0.5 rounded">{item.direction}</span>}
                          <span className="text-xs text-gray-600">by {item.createdBy?.name}</span>
                          <span className="text-xs text-gray-600 ml-auto">
                            {new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} {new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {text && <p className="text-sm text-gray-400 mt-0.5">{text}</p>}
                        {item.type === 'stage_change' && item.from && (
                          <p className="text-xs text-gray-500 mt-0.5">{item.from} → {item.to}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lost Reason Modal */}
      {pendingStage === 'lost' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#0A1628] border border-red-800 rounded-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="text-white font-bold">Mark as Lost</h3>
            <textarea value={lostReason} onChange={(e) => setLostReason(e.target.value)} placeholder="Why was this lead lost? (optional)" rows={3} className="w-full bg-[#1A3A6B]/20 border border-[#1A3A6B] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none resize-none" />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setPendingStage(null)} className="px-4 py-2 text-sm text-gray-400 border border-[#1A3A6B] rounded-lg hover:text-white">Cancel</button>
              <button onClick={confirmLostStage} className="px-4 py-2 text-sm bg-red-700 hover:bg-red-600 text-white rounded-lg">Confirm Lost</button>
            </div>
          </div>
        </div>
      )}

      <LeadFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEdit}
        initial={lead ? { ...lead, source: lead.source?._id || lead.source } : null}
        saving={saving}
      />

      <ReassignModal
        open={reassignOpen}
        onClose={() => setReassignOpen(false)}
        lead={lead}
      />
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-gray-500 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-200 break-words">{value}</p>
      </div>
    </div>
  );
}

function PriorityBadge({ p }) {
  const colors = { low: 'text-gray-400', medium: 'text-yellow-400', high: 'text-red-400' };
  return <span className={`font-medium ${colors[p] || 'text-gray-400'}`}>{p}</span>;
}
