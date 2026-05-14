import { useEffect } from 'react';
import { useForm }   from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z }          from 'zod';
import { X }          from 'lucide-react';

const schema = z.object({
  name:        z.string().min(1, 'Name is required'),
  companyName: z.string().optional(),
  email:       z.string().email().optional().or(z.literal('')),
  mobile:      z.string().min(10).optional().or(z.literal('')),
  gstin:       z.string().optional(),
  pan:         z.string().optional(),
  industry:    z.string().optional(),
  notes:       z.string().optional(),
});

const INDUSTRIES = ['real_estate','education','healthcare','finance','ecommerce','hospitality','manufacturing','retail','technology','media','other'];

export default function ClientFormModal({ open, onClose, onSubmit, initial, saving }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema), defaultValues: initial || {},
  });

  useEffect(() => { if (open) reset(initial || {}); }, [open, initial, reset]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#0A1628] border border-[#1A3A6B] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[#1A3A6B]">
          <h2 className="text-lg font-bold text-white">{initial?._id ? 'Edit Client' : 'New Client'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Client Name *', name: 'name', placeholder: 'Rahul Sharma' },
              { label: 'Company Name',  name: 'companyName', placeholder: 'Acme Corp' },
              { label: 'Email',         name: 'email', placeholder: 'rahul@acme.com' },
              { label: 'Mobile',        name: 'mobile', placeholder: '9999999999' },
              { label: 'GSTIN',         name: 'gstin', placeholder: '07AAACR5055K1Z5' },
              { label: 'PAN',           name: 'pan', placeholder: 'AAACR5055K' },
            ].map(({ label, name, placeholder }) => (
              <div key={name}>
                <label className="block text-xs text-gray-400 mb-1">{label}</label>
                <input {...register(name)} placeholder={placeholder} className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1E6FD9]" />
                {errors[name] && <p className="text-red-400 text-xs mt-1">{errors[name].message}</p>}
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Industry</label>
            <select {...register('industry')} className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-white text-sm">
              <option value="">Select industry...</option>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Notes</label>
            <textarea {...register('notes')} rows={2} className="w-full bg-[#1A3A6B]/40 border border-[#1A3A6B] rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 border border-[#1A3A6B] rounded-lg hover:text-white">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm bg-[#1E6FD9] hover:bg-blue-600 text-white rounded-lg disabled:opacity-50">
              {saving ? 'Saving...' : (initial?._id ? 'Update' : 'Create Client')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
