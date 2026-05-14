import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector }  from 'react-redux';
import { fetchClient, updateClient, clearCurrentClient, fetchServices } from '../../../store/clientsSlice';
import { clientsApi } from '../../../api/clients.api';
import { ArrowLeft, Phone, Mail, Building2, MapPin, Plus, X, CheckCircle, Clock, AlertCircle, MonitorCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import ClientFormModal from '../components/ClientFormModal';

const TABS = ['Profile', 'Subscriptions', 'Contacts', 'Tickets'];

const HEALTH_CONFIG = {
  green:  { label: 'Healthy',  cls: 'bg-green-900/40 text-green-400 border-green-700' },
  yellow: { label: 'At Risk',  cls: 'bg-yellow-900/40 text-yellow-400 border-yellow-700' },
  red:    { label: 'Critical', cls: 'bg-red-900/40 text-red-400 border-red-700' },
};

const SUB_STATUS_COLORS = { active: 'text-green-400', paused: 'text-yellow-400', cancelled: 'text-red-400', expired: 'text-gray-500' };
const TICKET_STATUS_ICONS = { open: AlertCircle, in_progress: Clock, resolved: CheckCircle, closed: CheckCircle };
const BILLING_LABELS = { monthly: 'Monthly', quarterly: 'Quarterly', half_yearly: 'Half-Yearly', annual: 'Annual', custom: 'Custom' };

export default function ClientDetailPage() {
  const { id }   = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const client   = useSelector((s) => s.clients.currentClient);
  const services = useSelector((s) => s.clients.services);
  const saving   = useSelector((s) => s.clients.saving);

  const [tab,     setTab]    = useState('Profile');
  const [editOpen, setEditOpen] = useState(false);

  const [subs,    setSubs]    = useState([]);
  const [contacts, setContacts] = useState([]);
  const [tickets, setTickets] = useState([]);

  const [subForm,     setSubForm]     = useState(null);
  const [contactForm, setContactForm] = useState(null);
  const [ticketForm,  setTicketForm]  = useState(null);
  const [saving2, setSaving2] = useState(false);

  useEffect(() => {
    dispatch(fetchClient(id));
    dispatch(fetchServices());
    return () => dispatch(clearCurrentClient());
  }, [id]);

  useEffect(() => {
    if (tab === 'Subscriptions') clientsApi.listSubscriptions(id).then((r) => setSubs(r.data.data.subscriptions));
    if (tab === 'Contacts')      clientsApi.listContacts(id).then((r) => setContacts(r.data.data.contacts));
    if (tab === 'Tickets')       clientsApi.listTickets(id).then((r) => setTickets(r.data.data.tickets));
  }, [tab, id]);

  const handleEdit = async (data) => {
    await dispatch(updateClient({ id, data }));
    setEditOpen(false);
  };

  const handleAddSub = async () => {
    if (!subForm?.service || !subForm?.startDate || !subForm?.renewalDate || !subForm?.billingCycle) return;
    setSaving2(true);
    try {
      await clientsApi.addSubscription(id, subForm);
      const r = await clientsApi.listSubscriptions(id);
      setSubs(r.data.data.subscriptions);
      setSubForm(null);
    } finally { setSaving2(false); }
  };

  const handleAddContact = async () => {
    if (!contactForm?.name) return;
    setSaving2(true);
    try {
      await clientsApi.addContact(id, contactForm);
      const r = await clientsApi.listContacts(id);
      setContacts(r.data.data.contacts);
      setContactForm(null);
    } finally { setSaving2(false); }
  };

  const handleAddTicket = async () => {
    if (!ticketForm?.title) return;
    setSaving2(true);
    try {
      await clientsApi.addTicket(id, ticketForm);
      const r = await clientsApi.listTickets(id);
      setTickets(r.data.data.tickets);
      setTicketForm(null);
    } finally { setSaving2(false); }
  };

  if (!client) return <div className="flex items-center justify-center h-64 text-gray-400">Loading client...</div>;

  const hcfg = HEALTH_CONFIG[client.healthScore] || HEALTH_CONFIG.green;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/crm/clients')} className="p-2 text-gray-400 hover:text-white border border-[#1A3A6B] rounded-lg mt-0.5"><ArrowLeft size={16} /></button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{client.name}</h1>
            <span className={`px-3 py-1 text-xs font-medium rounded-full border ${hcfg.cls}`}>{hcfg.label}</span>
          </div>
          {client.companyName && <p className="text-gray-400 text-sm mt-0.5">{client.companyName}</p>}
        </div>
        <Link to={`/dm/clients/${id}/setup`} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-[#1A3A6B] text-gray-300 hover:text-white rounded-lg">
          <MonitorCheck size={14} /> DM Setup
        </Link>
        <button onClick={() => setEditOpen(true)} className="px-4 py-2 text-sm border border-[#1A3A6B] text-gray-300 hover:text-white rounded-lg">Edit</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1A3A6B]">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium transition-colors ${tab === t ? 'text-white border-b-2 border-[#1E6FD9]' : 'text-gray-400 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === 'Profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl p-5 space-y-3">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Contact Info</h3>
            {client.mobile  && <Row icon={<Phone size={14} />}     label="Mobile"  value={client.mobile} />}
            {client.email   && <Row icon={<Mail size={14} />}      label="Email"   value={client.email} />}
            {client.companyName && <Row icon={<Building2 size={14} />} label="Company" value={client.companyName} />}
            {client.industry && <Row icon={<MapPin size={14} />}   label="Industry" value={client.industry.replace(/_/g, ' ')} />}
          </div>
          <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl p-5 space-y-3">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Business</h3>
            {client.gstin && <Row icon={null} label="GSTIN" value={client.gstin} />}
            {client.pan   && <Row icon={null} label="PAN"   value={client.pan} />}
            <Row icon={null} label="Account Manager" value={client.accountManager?.name || 'Unassigned'} />
            <Row icon={null} label="Onboarded" value={new Date(client.onboardingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
            {client.convertedFrom && <Row icon={null} label="Converted From" value={`Lead: ${client.convertedFrom.name}`} />}
          </div>
          {client.notes && (
            <div className="md:col-span-2 bg-[#0A1628] border border-[#1A3A6B] rounded-xl p-5">
              <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Notes</h3>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Subscriptions Tab */}
      {tab === 'Subscriptions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-white font-semibold">Active Subscriptions</h3>
            <button onClick={() => setSubForm({ billingCycle: 'monthly' })} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-[#1E6FD9] hover:bg-blue-600 text-white rounded-lg">
              <Plus size={13} /> Add Service
            </button>
          </div>

          {subForm && (
            <div className="bg-[#0A1628] border border-[#1E6FD9] rounded-xl p-5 space-y-4">
              <h4 className="text-white font-medium text-sm">New Subscription</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Service *</label>
                  <select value={subForm.service || ''} onChange={(e) => setSubForm((f) => ({ ...f, service: e.target.value }))} className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-sm text-white">
                    <option value="">Select service...</option>
                    {services.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Billing Cycle *</label>
                  <select value={subForm.billingCycle} onChange={(e) => setSubForm((f) => ({ ...f, billingCycle: e.target.value }))} className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-sm text-white">
                    {Object.entries(BILLING_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Start Date *</label>
                  <input type="date" value={subForm.startDate || ''} onChange={(e) => setSubForm((f) => ({ ...f, startDate: e.target.value }))} className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Renewal Date *</label>
                  <input type="date" value={subForm.renewalDate || ''} onChange={(e) => setSubForm((f) => ({ ...f, renewalDate: e.target.value }))} className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-sm text-white" />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setSubForm(null)} className="px-3 py-1.5 text-sm text-gray-400 border border-[#1A3A6B] rounded-lg hover:text-white">Cancel</button>
                <button onClick={handleAddSub} disabled={saving2} className="px-4 py-1.5 text-sm bg-[#1E6FD9] text-white rounded-lg disabled:opacity-50">
                  {saving2 ? 'Saving...' : 'Add'}
                </button>
              </div>
            </div>
          )}

          {subs.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No subscriptions yet</p>
          ) : (
            <div className="space-y-3">
              {subs.map((s) => (
                <div key={s._id} className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-white font-medium text-sm">{s.service?.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{BILLING_LABELS[s.billingCycle]} · Renews {new Date(s.renewalDate).toLocaleDateString('en-IN')}</p>
                  </div>
                  <span className={`text-xs font-medium capitalize ${SUB_STATUS_COLORS[s.status]}`}>{s.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contacts Tab */}
      {tab === 'Contacts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-white font-semibold">Contacts</h3>
            <button onClick={() => setContactForm({})} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-[#1E6FD9] hover:bg-blue-600 text-white rounded-lg">
              <Plus size={13} /> Add Contact
            </button>
          </div>

          {contactForm && (
            <div className="bg-[#0A1628] border border-[#1E6FD9] rounded-xl p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[{ label: 'Name *', key: 'name' }, { label: 'Role', key: 'role' }, { label: 'Email', key: 'email' }, { label: 'Mobile', key: 'mobile' }].map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-400 mb-1">{label}</label>
                    <input value={contactForm[key] || ''} onChange={(e) => setContactForm((f) => ({ ...f, [key]: e.target.value }))} className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-sm text-white" />
                  </div>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={!!contactForm.isPrimary} onChange={(e) => setContactForm((f) => ({ ...f, isPrimary: e.target.checked }))} className="accent-[#1E6FD9]" />
                Primary contact
              </label>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setContactForm(null)} className="px-3 py-1.5 text-sm text-gray-400 border border-[#1A3A6B] rounded-lg hover:text-white">Cancel</button>
                <button onClick={handleAddContact} disabled={saving2} className="px-4 py-1.5 text-sm bg-[#1E6FD9] text-white rounded-lg disabled:opacity-50">{saving2 ? 'Saving...' : 'Add'}</button>
              </div>
            </div>
          )}

          {contacts.length === 0 ? <p className="text-gray-500 text-sm text-center py-8">No contacts yet</p> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {contacts.map((c) => (
                <div key={c._id} className={`bg-[#0A1628] border rounded-xl p-4 ${c.isPrimary ? 'border-[#1E6FD9]/50' : 'border-[#1A3A6B]'}`}>
                  <div className="flex justify-between items-start">
                    <p className="text-white font-medium text-sm">{c.name}</p>
                    {c.isPrimary && <span className="text-xs text-[#1E6FD9]">Primary</span>}
                  </div>
                  {c.role   && <p className="text-xs text-gray-500 mt-0.5">{c.role}</p>}
                  {c.email  && <p className="text-xs text-gray-400 mt-1">{c.email}</p>}
                  {c.mobile && <p className="text-xs text-gray-400">{c.mobile}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tickets Tab */}
      {tab === 'Tickets' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-white font-semibold">Service Tickets</h3>
            <button onClick={() => setTicketForm({ priority: 'medium' })} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-[#1E6FD9] hover:bg-blue-600 text-white rounded-lg">
              <Plus size={13} /> New Ticket
            </button>
          </div>

          {ticketForm && (
            <div className="bg-[#0A1628] border border-[#1E6FD9] rounded-xl p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">Title *</label>
                  <input value={ticketForm.title || ''} onChange={(e) => setTicketForm((f) => ({ ...f, title: e.target.value }))} className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-sm text-white" placeholder="Issue title..." />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Priority</label>
                  <select value={ticketForm.priority || 'medium'} onChange={(e) => setTicketForm((f) => ({ ...f, priority: e.target.value }))} className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-sm text-white">
                    {['low','medium','high','urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <textarea value={ticketForm.description || ''} onChange={(e) => setTicketForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-sm text-white resize-none" />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setTicketForm(null)} className="px-3 py-1.5 text-sm text-gray-400 border border-[#1A3A6B] rounded-lg hover:text-white">Cancel</button>
                <button onClick={handleAddTicket} disabled={saving2} className="px-4 py-1.5 text-sm bg-[#1E6FD9] text-white rounded-lg disabled:opacity-50">{saving2 ? 'Saving...' : 'Create'}</button>
              </div>
            </div>
          )}

          {tickets.length === 0 ? <p className="text-gray-500 text-sm text-center py-8">No tickets yet</p> : (
            <div className="space-y-3">
              {tickets.map((t) => {
                const Icon = TICKET_STATUS_ICONS[t.status] || AlertCircle;
                const priorityColors = { low: 'text-gray-400', medium: 'text-yellow-400', high: 'text-orange-400', urgent: 'text-red-400' };
                return (
                  <div key={t._id} className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl p-4 flex items-start gap-3">
                    <Icon size={16} className="text-gray-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{t.title}</p>
                      {t.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{t.description}</p>}
                      <p className="text-xs text-gray-600 mt-1">{new Date(t.createdAt).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs font-medium capitalize ${priorityColors[t.priority]}`}>{t.priority}</span>
                      <span className="text-xs text-gray-500 capitalize">{t.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <ClientFormModal open={editOpen} onClose={() => setEditOpen(false)} onSubmit={handleEdit} initial={client} saving={saving} />
    </div>
  );
}

function Row({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="text-gray-500 mt-0.5 shrink-0">{icon}</span>}
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-200 capitalize">{value}</p>
      </div>
    </div>
  );
}
