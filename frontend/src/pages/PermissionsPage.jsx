import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchUsers } from '../store/usersSlice'
import api from '../api/axios'
import { Shield, Check, ChevronDown, ChevronRight } from 'lucide-react'

const MODULE_LABELS = {
  core: 'Core / Admin',
  crm: 'CRM (Sales)',
  dm: 'Digital Marketing',
  gd: 'Graphic & Video',
  dev: 'Development',
  hr: 'Human Resources',
}

const MODULE_COLORS = {
  core: '#1E6FD9',
  crm: '#FF6B00',
  dm: '#00C6FF',
  gd: '#a855f7',
  dev: '#22c55e',
  hr: '#f59e0b',
}

export default function PermissionsPage() {
  const dispatch = useDispatch()
  const { list: users } = useSelector((s) => s.users)
  const { user: me } = useSelector((s) => s.auth)

  const [allPerms, setAllPerms] = useState({})        // grouped by module
  const [selectedUser, setSelectedUser] = useState(null)
  const [userPerms, setUserPerms] = useState([])       // current user's permissions
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expandedModules, setExpandedModules] = useState({})

  useEffect(() => {
    dispatch(fetchUsers({ limit: 100 }))
    api.get('/permissions').then(({ data }) => {
      setAllPerms(data.data.grouped || {})
      // expand all by default
      const expanded = {}
      Object.keys(data.data.grouped || {}).forEach((m) => { expanded[m] = true })
      setExpandedModules(expanded)
    })
  }, [dispatch])

  const selectUser = async (user) => {
    setSelectedUser(user)
    setSaved(false)
    const { data } = await api.get(`/permissions/users/${user._id}`)
    setUserPerms(data.data.user.permissions || [])
  }

  const toggle = (key) => {
    setUserPerms((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
    setSaved(false)
  }

  const toggleModule = (keys) => {
    const allSelected = keys.every((k) => userPerms.includes(k))
    if (allSelected) {
      setUserPerms((prev) => prev.filter((k) => !keys.includes(k)))
    } else {
      setUserPerms((prev) => [...new Set([...prev, ...keys])])
    }
    setSaved(false)
  }

  const savePerms = async () => {
    if (!selectedUser) return
    setSaving(true)
    try {
      await api.put(`/permissions/users/${selectedUser._id}`, { permissions: userPerms })
      setSaved(true)
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const nonSuperadminUsers = users.filter((u) => u.role !== 'SUPERADMIN' && !u.deletedAt)

  return (
    <div className="flex gap-6 h-full">

      {/* Left: User list */}
      <div className="w-64 flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3 px-1">Select User</h2>
        <div className="space-y-1">
          {nonSuperadminUsers.map((u) => (
            <button
              key={u._id}
              onClick={() => selectUser(u)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-colors"
              style={{
                backgroundColor: selectedUser?._id === u._id ? '#1E6FD9' : 'rgba(255,255,255,0.04)',
                color: selectedUser?._id === u._id ? '#fff' : '#9ca3af',
              }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ backgroundColor: selectedUser?._id === u._id ? 'rgba(255,255,255,0.3)' : '#1A3A6B' }}
              >
                {u.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium leading-none mb-0.5">{u.name}</p>
                <p className="text-xs truncate opacity-60">{u.role}</p>
              </div>
            </button>
          ))}
          {nonSuperadminUsers.length === 0 && (
            <p className="text-gray-500 text-sm px-1">No users found</p>
          )}
        </div>
      </div>

      {/* Right: Permission matrix */}
      <div className="flex-1 min-w-0">
        {!selectedUser ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-600">
            <Shield size={40} className="mb-3 opacity-30" />
            <p className="text-sm">Select a user to manage permissions</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">{selectedUser.name}</h2>
                <p className="text-sm text-gray-400">{selectedUser.email} · <span style={{ color: '#00C6FF' }}>{selectedUser.role}</span></p>
              </div>
              <div className="flex items-center gap-3">
                {saved && <span className="text-sm text-green-400 flex items-center gap-1"><Check size={14} /> Saved</span>}
                <button
                  onClick={savePerms}
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: '#1E6FD9' }}
                >
                  {saving ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </div>

            {/* Permission groups */}
            <div className="space-y-3">
              {Object.entries(allPerms).map(([module, perms]) => {
                const permKeys = perms.map((p) => p.key)
                const allSelected = permKeys.every((k) => userPerms.includes(k))
                const someSelected = permKeys.some((k) => userPerms.includes(k))
                const expanded = expandedModules[module]
                const color = MODULE_COLORS[module] || '#1E6FD9'

                return (
                  <div key={module} className="rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#1A3A6B' }}>
                    {/* Module header */}
                    <div
                      className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
                      onClick={() => setExpandedModules((prev) => ({ ...prev, [module]: !prev[module] }))}
                    >
                      <div className="flex items-center gap-3">
                        {expanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{MODULE_LABELS[module] || module}</span>
                        <span className="text-xs text-gray-500">{perms.length} permissions</span>
                      </div>
                      {/* Select all toggle */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleModule(permKeys) }}
                        className="text-xs px-3 py-1 rounded-lg transition-colors"
                        style={{
                          backgroundColor: allSelected ? `${color}30` : 'rgba(255,255,255,0.06)',
                          color: allSelected ? color : '#9ca3af',
                        }}
                      >
                        {allSelected ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>

                    {/* Permission toggles */}
                    {expanded && (
                      <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        {perms.map((perm) => {
                          const active = userPerms.includes(perm.key)
                          return (
                            <label
                              key={perm.key}
                              className="flex items-center gap-3 mt-3 cursor-pointer group"
                            >
                              <div
                                onClick={() => toggle(perm.key)}
                                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors"
                                style={{
                                  backgroundColor: active ? color : 'transparent',
                                  borderColor: active ? color : 'rgba(255,255,255,0.2)',
                                }}
                              >
                                {active && <Check size={11} className="text-white" strokeWidth={3} />}
                              </div>
                              <div>
                                <p className={`text-sm leading-none transition-colors ${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>
                                  {perm.label}
                                </p>
                                <p className="text-xs text-gray-600 mt-0.5 font-mono">{perm.key}</p>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
