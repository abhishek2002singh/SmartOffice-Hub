import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDispatch, useSelector } from 'react-redux'
import { fetchMeThunk } from '../store/authSlice'
import { useState } from 'react'
import api from '../api/axios'
import { User, Lock, Save, Check } from 'lucide-react'

const profileSchema = z.object({
  name:  z.string().min(2, 'Name required'),
  phone: z.string().optional(),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'Required'),
  newPassword:     z.string().min(6, 'Min 6 characters'),
  confirmPassword: z.string().min(6, 'Required'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

const inputCls = 'w-full px-4 py-3 rounded-xl text-sm text-white border focus:outline-none transition'
const inputStyle = { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }

function Section({ icon: Icon, title, children }) {
  return (
    <div className="rounded-2xl border" style={{ backgroundColor: '#1A3A6B', borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(30,111,217,0.2)' }}>
          <Icon size={16} style={{ color: '#1E6FD9' }} />
        </div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

export default function ProfilePage() {
  const dispatch = useDispatch()
  const { user } = useSelector((s) => s.auth)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileErr, setProfileErr]     = useState('')
  const [pwdSaved, setPwdSaved]         = useState(false)
  const [pwdErr, setPwdErr]             = useState('')

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '', phone: user?.phone || '' },
  })

  const pwdForm = useForm({ resolver: zodResolver(passwordSchema) })

  const onProfileSubmit = async (values) => {
    setProfileErr('')
    try {
      await api.patch('/profile', values)
      await dispatch(fetchMeThunk())
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    } catch (err) {
      setProfileErr(err.response?.data?.error?.message || 'Update failed')
    }
  }

  const onPwdSubmit = async (values) => {
    setPwdErr('')
    try {
      await api.patch('/profile/password', {
        currentPassword: values.currentPassword,
        newPassword:     values.newPassword,
      })
      pwdForm.reset()
      setPwdSaved(true)
      setTimeout(() => setPwdSaved(false), 3000)
    } catch (err) {
      setPwdErr(err.response?.data?.error?.message || 'Password change failed')
    }
  }

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'

  return (
    <div className="max-w-xl space-y-6">

      {/* Avatar + meta */}
      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white"
          style={{ backgroundColor: '#1E6FD9' }}
        >
          {initials}
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{user?.name}</h2>
          <p className="text-sm text-gray-400">{user?.email}</p>
          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(0,198,255,0.15)', color: '#00C6FF' }}>
            {user?.role}
          </span>
        </div>
      </div>

      {/* Profile info */}
      <Section icon={User} title="Personal Information">
        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Full Name</label>
            <input {...profileForm.register('name')} className={inputCls} style={inputStyle} />
            {profileForm.formState.errors.name && (
              <p className="text-red-400 text-xs mt-1">{profileForm.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Phone</label>
            <input {...profileForm.register('phone')} className={inputCls} style={inputStyle} placeholder="9999999999" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Email <span className="text-gray-500">(cannot change)</span></label>
            <input value={user?.email || ''} disabled className={inputCls} style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
          </div>

          {profileErr && <p className="text-red-400 text-sm">{profileErr}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={profileForm.formState.isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: '#1E6FD9' }}
            >
              <Save size={14} /> {profileForm.formState.isSubmitting ? 'Saving...' : 'Save Profile'}
            </button>
            {profileSaved && <span className="text-sm text-green-400 flex items-center gap-1"><Check size={14} /> Saved!</span>}
          </div>
        </form>
      </Section>

      {/* Change password */}
      <Section icon={Lock} title="Change Password">
        <form onSubmit={pwdForm.handleSubmit(onPwdSubmit)} className="space-y-4">
          {['currentPassword', 'newPassword', 'confirmPassword'].map((field, i) => (
            <div key={field}>
              <label className="block text-sm text-gray-300 mb-1.5">
                {['Current Password', 'New Password', 'Confirm New Password'][i]}
              </label>
              <input
                {...pwdForm.register(field)}
                type="password"
                className={inputCls}
                style={inputStyle}
                placeholder="••••••••"
              />
              {pwdForm.formState.errors[field] && (
                <p className="text-red-400 text-xs mt-1">{pwdForm.formState.errors[field].message}</p>
              )}
            </div>
          ))}

          {pwdErr && <p className="text-red-400 text-sm">{pwdErr}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pwdForm.formState.isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: '#1E6FD9' }}
            >
              <Lock size={14} /> {pwdForm.formState.isSubmitting ? 'Updating...' : 'Change Password'}
            </button>
            {pwdSaved && <span className="text-sm text-green-400 flex items-center gap-1"><Check size={14} /> Password changed!</span>}
          </div>
        </form>
      </Section>
    </div>
  )
}
