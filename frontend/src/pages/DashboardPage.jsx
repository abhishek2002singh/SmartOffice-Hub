import { useSelector } from 'react-redux'

export default function DashboardPage() {
  const { user } = useSelector((s) => s.auth)

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Welcome back, {user?.name} 👋</h2>
        <p className="text-gray-400 text-sm mt-1">ANK Management System — Phase 1</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Role', value: user?.role, color: '#1E6FD9' },
          { label: 'Status', value: 'Active', color: '#22c55e' },
          { label: 'Department', value: user?.department?.name || 'Not assigned', color: '#FF6B00' },
          { label: 'Phase', value: 'Phase 1 — Foundation', color: '#00C6FF' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-5 border" style={{ backgroundColor: '#1A3A6B', borderColor: 'rgba(255,255,255,0.08)' }}>
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className="text-base font-semibold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl p-6 border" style={{ backgroundColor: '#1A3A6B', borderColor: 'rgba(255,255,255,0.08)' }}>
        <p className="text-gray-400 text-sm">More modules coming soon — CRM, DM, HR, and more!</p>
      </div>
    </div>
  )
}
