import { useEffect } from 'react';
import { useForm }   from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z }          from 'zod';
import { useSelector } from 'react-redux';
import { X }          from 'lucide-react';

const schema = z.object({
  name:        z.string().min(1, 'Name is required'),
  mobile:      z.string().min(10, 'Min 10 digits').regex(/^\+?[0-9]{10,15}$/, 'Invalid mobile'),
  email:       z.string().email('Invalid email').optional().or(z.literal('')),
  company:     z.string().optional(),
  designation: z.string().optional(),
  city:        z.string().optional(),
  source:      z.string().min(1, 'Source is required'),
  priority:    z.enum(['low', 'medium', 'high']).optional(),
  description: z.string().optional(),
  budget:      z.coerce.number().min(0).optional(),
  nextFollowUp: z.string().optional(),
});

const PRIORITIES = ['low', 'medium', 'high'];

export default function LeadFormModal({ open, onClose, onSubmit, initial, saving }) {
  const sources = useSelector((s) => s.leads.sources);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium', ...initial },
  });

  useEffect(() => {
    if (open) reset({ priority: 'medium', ...initial });
  }, [open, initial, reset]);

  if (!open) return null;

  const submit = (data) => {
    if (!data.email) delete data.email;
    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[#1A3A6B]">
          <h2 className="text-lg font-bold text-white">{initial?._id ? 'Edit Lead' : 'New Lead'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit(submit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Full Name *</label>
              <input {...register('name')} className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1E6FD9]" placeholder="Rahul Sharma" />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Mobile *</label>
              <input {...register('mobile')} className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1E6FD9]" placeholder="9999999999" />
              {errors.mobile && <p className="text-red-400 text-xs mt-1">{errors.mobile.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Email</label>
              <input {...register('email')} type="email" className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1E6FD9]" placeholder="rahul@company.com" />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Company</label>
              <input {...register('company')} className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1E6FD9]" placeholder="Acme Corp" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Designation</label>
              <input {...register('designation')} className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1E6FD9]" placeholder="CEO" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">City</label>
              <input {...register('city')} className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1E6FD9]" placeholder="Delhi" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Source *</label>
              <select {...register('source')} className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1E6FD9]">
                <option value="">Select source...</option>
                {sources.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
              {errors.source && <p className="text-red-400 text-xs mt-1">{errors.source.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Priority</label>
              <select {...register('priority')} className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1E6FD9]">
                {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Budget (₹)</label>
              <input {...register('budget')} type="number" min="0" className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1E6FD9]" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Next Follow-up</label>
              <input {...register('nextFollowUp')} type="datetime-local" className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1E6FD9]" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Description</label>
            <textarea {...register('description')} rows={3} className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1E6FD9] resize-none" placeholder="Lead notes..." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-[#1A3A6B] rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm bg-[#1E6FD9] hover:bg-blue-600 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Saving...' : (initial?._id ? 'Update Lead' : 'Create Lead')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
