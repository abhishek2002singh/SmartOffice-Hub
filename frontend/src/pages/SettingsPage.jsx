import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSelector } from 'react-redux'
import { Save, Building2 } from 'lucide-react'
import api from '../api/axios'
import { useState } from 'react'

const schema = z.object({
  companyName: z.string().min(2, 'Company name required'),
  companyEmail: z.string().email('Valid email required'),
  companyPhone: z.string().min(6, 'Phone required'),
  companyWebsite: z.string().min(3, 'Website required'),
  companyAddress: z.string().min(3, 'Address required'),
  fiscalYearStart: z.enum(['January', 'April', 'July', 'October']),
  timezone: z.string().min(2),
})

const inputCls = 'w-full px-4 py-3 rounded-xl text-sm text-white border focus:outline-none transition'
const inputStyle = { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

export default function SettingsPage() {
  const { user: me } = useSelector((s) => s.auth)
  const isSuperadmin = me?.role === 'SUPERADMIN'

  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [serverErr, setServerErr] = useState('')

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    api.get('/settings').then(({ data }) => {
      reset(data.data.settings)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [reset])

  const onSubmit = async (values) => {
    setServerErr('')
    try {
      await api.patch('/settings', values)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setServerErr(err.response?.data?.error?.message || 'Save failed')
    }
  }

  if (loading) return <div className="text-gray-500 text-sm">Loading settings...</div>

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(30,111,217,0.2)' }}>
          <Building2 size={20} style={{ color: '#1E6FD9' }} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Company Settings</h2>
          <p className="text-sm text-gray-400">ANK Digital Media internal configuration</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="rounded-2xl p-6 border space-y-5" style={{ backgroundColor: '#1A3A6B', borderColor: 'rgba(255,255,255,0.08)' }}>
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Company Info</h3>

          <Field label="Company Name" error={errors.companyName?.message}>
            <input {...register('companyName')} disabled={!isSuperadmin} className={inputCls} style={inputStyle} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email" error={errors.companyEmail?.message}>
              <input {...register('companyEmail')} type="email" disabled={!isSuperadmin} className={inputCls} style={inputStyle} />
            </Field>
            <Field label="Phone" error={errors.companyPhone?.message}>
              <input {...register('companyPhone')} disabled={!isSuperadmin} className={inputCls} style={inputStyle} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Website" error={errors.companyWebsite?.message}>
              <input {...register('companyWebsite')} disabled={!isSuperadmin} className={inputCls} style={inputStyle} />
            </Field>
            <Field label="Address" error={errors.companyAddress?.message}>
              <input {...register('companyAddress')} disabled={!isSuperadmin} className={inputCls} style={inputStyle} />
            </Field>
          </div>
        </div>

        <div className="rounded-2xl p-6 border space-y-5" style={{ backgroundColor: '#1A3A6B', borderColor: 'rgba(255,255,255,0.08)' }}>
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Regional Settings</h3>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Fiscal Year Start" error={errors.fiscalYearStart?.message}>
              <select {...register('fiscalYearStart')} disabled={!isSuperadmin} className={inputCls} style={{ ...inputStyle, cursor: isSuperadmin ? 'pointer' : 'not-allowed' }}>
                {['January', 'April', 'July', 'October'].map((m) => (
                  <option key={m} value={m} style={{ backgroundColor: '#1A3A6B' }}>{m}</option>
                ))}
              </select>
            </Field>
            <Field label="Timezone" error={errors.timezone?.message}>
              <select {...register('timezone')} disabled={!isSuperadmin} className={inputCls} style={{ ...inputStyle, cursor: isSuperadmin ? 'pointer' : 'not-allowed' }}>
                {['Asia/Kolkata', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Dubai'].map((tz) => (
                  <option key={tz} value={tz} style={{ backgroundColor: '#1A3A6B' }}>{tz}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {!isSuperadmin && (
          <p className="text-sm text-gray-500">Only Superadmin can modify settings.</p>
        )}

        {serverErr && <p className="text-red-400 text-sm">{serverErr}</p>}

        {isSuperadmin && (
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: '#1E6FD9' }}
            >
              <Save size={15} /> {isSubmitting ? 'Saving...' : 'Save Settings'}
            </button>
            {saved && <span className="text-sm text-green-400">Settings saved!</span>}
          </div>
        )}
      </form>
    </div>
  )
}
