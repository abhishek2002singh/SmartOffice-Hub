import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, User, ChevronDown } from 'lucide-react'
import { logoutThunk } from '../../store/authSlice'

export default function Topbar({ title }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector((s) => s.auth)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleLogout = async () => {
    await dispatch(logoutThunk())
    navigate('/login')
  }

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'

  return (
    <header
      className="flex items-center justify-between px-6 py-4 border-b"
      style={{ backgroundColor: '#0A1628', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <h1 className="text-lg font-semibold text-white">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <button className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: '#FF6B00' }} />
        </button>

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: '#1E6FD9' }}
            >
              {initials}
            </div>
            <span className="hidden sm:block">{user?.name}</span>
            <ChevronDown size={14} />
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg border overflow-hidden z-50"
              style={{ backgroundColor: '#1A3A6B', borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                <span
                  className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: 'rgba(0,198,255,0.15)', color: '#00C6FF' }}
                >
                  {user?.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
