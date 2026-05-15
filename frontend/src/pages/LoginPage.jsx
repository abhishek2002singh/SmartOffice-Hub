import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loginThunk, clearError } from '../store/authSlice'
import { useEffect } from 'react'

const schema = z.object({
  email: z.string().email('Valid email daalo'),
  password: z.string().min(6, 'Password kam se kam 6 characters ka hona chahiye'),
})

export default function LoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { error, loading } = useSelector((s) => s.auth)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    dispatch(clearError())
  }, [dispatch])

  const onSubmit = async ({ email, password }) => {
    const result = await dispatch(loginThunk({ email, password }))
    if (loginThunk.fulfilled.match(result)) {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0A1628' }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 overflow-hidden">
            <img src="/Ank_logo.jpg" alt="ANK Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-wide">AMS</h1>
          <p className="text-sm mt-1" style={{ color: '#00C6FF' }}>ANK Digital Media</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 shadow-2xl" style={{ backgroundColor: '#1A3A6B' }}>
          <h2 className="text-xl font-semibold text-white mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email address</label>
              <input
                type="email"
                autoComplete="email"
                {...register('email')}
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 border focus:outline-none transition"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderColor: errors.email ? '#ef4444' : 'rgba(255,255,255,0.15)',
                }}
                placeholder="you@ankdigitalmedia.com"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <input
                type="password"
                autoComplete="current-password"
                {...register('password')}
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 border focus:outline-none transition"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderColor: errors.password ? '#ef4444' : 'rgba(255,255,255,0.15)',
                }}
                placeholder="••••••••"
              />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {error && (
              <div className="rounded-lg px-4 py-3 text-sm text-red-300" style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-opacity disabled:opacity-60 cursor-pointer"
              style={{ backgroundColor: '#1E6FD9' }}
            >
              {isSubmitting || loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.3)' }}>
          ANK Digital Media · Internal Use Only
        </p>
      </div>
    </div>
  )
}
