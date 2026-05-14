import { useState, useEffect } from 'react';
import { useDispatch }         from 'react-redux';
import { X, UserCheck }        from 'lucide-react';
import { assignLead }          from '../../../store/leadsSlice';
import api                     from '../../../api/axios';

export default function ReassignModal({ open, onClose, lead }) {
  const dispatch = useDispatch();
  const [users,  setUsers]  = useState([]);
  const [userId, setUserId] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (open) {
      api.get('/users', { params: { limit: 100 } })
        .then((r) => setUsers(r.data.data.users || []))
        .catch(() => {});
      setUserId(''); setReason(''); setError('');
    }
  }, [open]);

  if (!open || !lead) return null;

  const handleAssign = async () => {
    if (!userId) { setError('Please select a team member'); return; }
    setSaving(true); setError('');
    const res = await dispatch(assignLead({ id: lead._id, assignedTo: userId }));
    if (res.error) { setError(res.payload || 'Assignment failed'); setSaving(false); return; }
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between p-5 border-b border-[#1A3A6B]">
          <div className="flex items-center gap-2 text-white font-bold">
            <UserCheck size={16} /> Reassign Lead
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Lead</p>
            <p className="text-white text-sm font-medium">{lead.name}</p>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Assign To *</label>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-sm text-white">
              <option value="">Select team member...</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Reason (optional)</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Why reassigning?" className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none resize-none" />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 border border-[#1A3A6B] rounded-lg hover:text-white">Cancel</button>
            <button onClick={handleAssign} disabled={saving} className="px-4 py-2 text-sm bg-[#1E6FD9] hover:bg-blue-600 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
