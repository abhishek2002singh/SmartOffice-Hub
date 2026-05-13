import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { fetchMeThunk } from './store/authSlice'
import ProtectedRoute from './components/ProtectedRoute'
import MasterLayout from './components/layout/MasterLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import UsersPage from './pages/UsersPage'
import DepartmentsPage from './pages/DepartmentsPage'
import PermissionsPage from './pages/PermissionsPage'
import SettingsPage from './pages/SettingsPage'

function AppRoutes() {
  const dispatch = useDispatch()

  useEffect(() => {
    if (localStorage.getItem('accessToken')) {
      dispatch(fetchMeThunk())
    } else {
      dispatch({ type: 'auth/fetchMe/rejected' })
    }
  }, [dispatch])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={
          <ProtectedRoute>
            <MasterLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="users" element={
            <ProtectedRoute minRole="ADMIN"><UsersPage /></ProtectedRoute>
          } />
          <Route path="departments" element={
            <ProtectedRoute minRole="ADMIN"><DepartmentsPage /></ProtectedRoute>
          } />
          <Route path="permissions" element={
            <ProtectedRoute minRole="SUPERADMIN"><PermissionsPage /></ProtectedRoute>
          } />
          <Route path="settings" element={
            <ProtectedRoute minRole="ADMIN"><SettingsPage /></ProtectedRoute>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return <AppRoutes />
}
