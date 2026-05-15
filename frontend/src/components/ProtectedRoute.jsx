import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

const ROLE_ORDER = ['TEAM_MEMBER', 'DEPT_HEAD', 'SUBADMIN', 'ADMIN', 'SUPERADMIN']

export default function ProtectedRoute({ children, minRole, requiredPermission }) {
  const { user, loading } = useSelector((s) => s.auth)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A1628' }}>
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (minRole && ROLE_ORDER.indexOf(user.role) < ROLE_ORDER.indexOf(minRole)) {
    return <Navigate to="/dashboard" replace />
  }

  // ADMIN and SUPERADMIN bypass module permission checks
  if (requiredPermission && ROLE_ORDER.indexOf(user.role) < ROLE_ORDER.indexOf('ADMIN')) {
    const hasPermission = Array.isArray(user.permissions) &&
      user.permissions.some((p) => p.startsWith(requiredPermission))
    if (!hasPermission) return <Navigate to="/dashboard" replace />
  }

  return children
}
