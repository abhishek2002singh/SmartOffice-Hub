import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, ChevronDown, Check, CheckCheck, Info, AlertTriangle, AlertCircle, CheckCircle, Search } from 'lucide-react'
import { logoutThunk } from '../../store/authSlice'
import { fetchNotifications, markRead, markAllRead, pushNotification } from '../../store/notificationSlice'
import { connectSocket, disconnectSocket } from '../../services/socket'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const TYPE_ICON = {
  INFO: <Info size={14} className="text-blue-400" />,
  SUCCESS: <CheckCircle size={14} className="text-green-400" />,
  WARNING: <AlertTriangle size={14} className="text-yellow-400" />,
  ERROR: <AlertCircle size={14} className="text-red-400" />,
  SYSTEM: <Info size={14} style={{ color: '#00C6FF' }} />,
}

export default function Topbar({ title }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector((s) => s.auth)
  const { list: notifications, unread } = useSelector((s) => s.notifications)

  const [bellOpen, setBellOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const bellRef = useRef(null)
  const userRef = useRef(null)

  // Fetch notifications on mount
  useEffect(() => {
    dispatch(fetchNotifications({ limit: 15 }))
  }, [dispatch])

  // Socket.io connection
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token || !user) return

    const socket = connectSocket(token)
    socket.on('notification:new', (notif) => {
      dispatch(pushNotification(notif))
    })

    return () => {
      socket.off('notification:new')
      disconnectSocket()
    }
  }, [user, dispatch])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false)
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    await dispatch(logoutThunk())
    navigate('/login')
  }

  const handleMarkRead = (id) => dispatch(markRead(id))
  const handleMarkAllRead = () => dispatch(markAllRead())

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'

  return (
    <header
      className="flex items-center justify-between px-6 py-3.5 border-b flex-shrink-0"
      style={{ backgroundColor: '#0A1628', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <h1 className="text-lg font-semibold text-white">{title}</h1>

      <div className="flex items-center gap-3">

        {/* Global Search (placeholder — wire up in Phase 2) */}
        <button
          className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-500 border transition-colors hover:border-white/20 hover:text-gray-400"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', minWidth: '180px' }}
          title="Global search (coming soon)"
        >
          <Search size={14} />
          <span>Search...</span>
          <span className="ml-auto text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>⌘K</span>
        </button>

        {/* Notification Bell */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => { setBellOpen((v) => !v); setUserOpen(false) }}
            className="relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Bell size={19} />
            {unread > 0 && (
              <span
                className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                style={{ backgroundColor: '#FF6B00' }}
              >
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {bellOpen && (
            <div
              className="absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl border overflow-hidden z-50"
              style={{ backgroundColor: '#112044', borderColor: 'rgba(255,255,255,0.1)' }}
            >
              {/* Bell header */}
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">Notifications</span>
                  {unread > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: '#FF6B00' }}>
                      {unread}
                    </span>
                  )}
                </div>
                {unread > 0 && (
                  <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                    <CheckCheck size={13} /> Mark all read
                  </button>
                )}
              </div>

              {/* Notification list */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center text-gray-500 text-sm">No notifications yet</div>
                ) : notifications.map((n) => (
                  <div
                    key={n._id}
                    onClick={() => !n.isRead && handleMarkRead(n._id)}
                    className="flex items-start gap-3 px-4 py-3 border-b cursor-pointer hover:bg-white/5 transition-colors"
                    style={{
                      borderColor: 'rgba(255,255,255,0.05)',
                      backgroundColor: n.isRead ? 'transparent' : 'rgba(30,111,217,0.08)',
                    }}
                  >
                    <div className="mt-0.5 flex-shrink-0">{TYPE_ICON[n.type] || TYPE_ICON.INFO}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${n.isRead ? 'text-gray-400' : 'text-white font-medium'}`}>{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>{dayjs(n.createdAt).fromNow()}</p>
                    </div>
                    {!n.isRead && (
                      <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: '#1E6FD9' }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User dropdown */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => { setUserOpen((v) => !v); setBellOpen(false) }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ backgroundColor: '#1E6FD9' }}
            >
              {initials}
            </div>
            <span className="hidden sm:block max-w-[120px] truncate">{user?.name}</span>
            <ChevronDown size={14} />
          </button>

          {userOpen && (
            <div
              className="absolute right-0 mt-2 w-52 rounded-2xl shadow-2xl border overflow-hidden z-50"
              style={{ backgroundColor: '#112044', borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                <span
                  className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: 'rgba(0,198,255,0.15)', color: '#00C6FF' }}
                >
                  {user?.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                <LogOut size={15} /> Sign out
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  )
}
