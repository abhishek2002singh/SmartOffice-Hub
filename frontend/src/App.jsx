import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { fetchMeThunk } from './store/authSlice'
import ProtectedRoute from './components/ProtectedRoute'
import MasterLayout from './components/layout/MasterLayout'

import LoginPage       from './pages/LoginPage'
import DashboardPage   from './pages/DashboardPage'
import UsersPage       from './pages/UsersPage'
import DepartmentsPage from './pages/DepartmentsPage'
import PermissionsPage from './pages/PermissionsPage'
import AuditLogPage    from './pages/AuditLogPage'
import SettingsPage    from './pages/SettingsPage'
import ProfilePage     from './pages/ProfilePage'

import LeadsPage        from './modules/crm/pages/LeadsPage'
import LeadDetailPage   from './modules/crm/pages/LeadDetailPage'
import ClientsPage      from './modules/crm/pages/ClientsPage'
import ClientDetailPage from './modules/crm/pages/ClientDetailPage'
import CRMDashboardPage from './modules/crm/pages/CRMDashboardPage'
import CRMReportsPage   from './modules/crm/pages/CRMReportsPage'

import DMDailyDashboard    from './modules/dm/pages/DMDailyDashboard'
import DMHeadDashboard     from './modules/dm/pages/DMHeadDashboard'
import DMConfigPage        from './modules/dm/pages/DMConfigPage'
import ClientDMSetupPage   from './modules/dm/pages/ClientDMSetupPage'
import DMAuditReportsPage  from './modules/dm/pages/DMAuditReportsPage'
import DMAuditFillPage     from './modules/dm/pages/DMAuditFillPage'
import DMAuditComparePage  from './modules/dm/pages/DMAuditComparePage'
import DMGDQueuePage       from './modules/dm/pages/DMGDQueuePage'

import CandidateListPage      from './modules/hr/pages/CandidateListPage'
import CandidateDetailPage    from './modules/hr/pages/CandidateDetailPage'
import AddCandidatePage       from './modules/hr/pages/AddCandidatePage'
import BulkImportPage         from './modules/hr/pages/BulkImportPage'
import RejectedPoolPage       from './modules/hr/pages/RejectedPoolPage'
import EmployeeDirectoryPage  from './modules/hr/pages/EmployeeDirectoryPage'
import EmployeeDetailPage     from './modules/hr/pages/EmployeeDetailPage'
import OnboardingWizardPage   from './modules/hr/pages/OnboardingWizardPage'
import EmployeeSelfServicePage from './modules/hr/pages/EmployeeSelfServicePage'
import MyAttendancePage       from './modules/hr/pages/MyAttendancePage'
import MyLeavesPage           from './modules/hr/pages/MyLeavesPage'
import LeaveApprovalsPage     from './modules/hr/pages/LeaveApprovalsPage'
import HRAttendancePage       from './modules/hr/pages/HRAttendancePage'
import HolidayCalendarPage    from './modules/hr/pages/HolidayCalendarPage'
import LeaveTypeConfigPage    from './modules/hr/pages/LeaveTypeConfigPage'

import DevProjectListPage        from './modules/dev/pages/DevProjectListPage'
import DevProjectDetailPage      from './modules/dev/pages/DevProjectDetailPage'
import DevHandoverInboxPage      from './modules/dev/pages/DevHandoverInboxPage'
import DevDeveloperDashboardPage from './modules/dev/pages/DevDeveloperDashboardPage'
import DevHeadDashboardPage      from './modules/dev/pages/DevHeadDashboardPage'

import GDDesignerDashboard from './modules/gd/pages/GDDesignerDashboard'
import GDHeadDashboard     from './modules/gd/pages/GDHeadDashboard'
import GDTaskInboxPage     from './modules/gd/pages/GDTaskInboxPage'
import GDTaskDetailPage    from './modules/gd/pages/GDTaskDetailPage'

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
          <Route path="dashboard"   element={<DashboardPage />} />
          <Route path="profile"     element={<ProfilePage />} />
          <Route path="users"       element={<ProtectedRoute minRole="ADMIN"><UsersPage /></ProtectedRoute>} />
          <Route path="departments" element={<ProtectedRoute minRole="ADMIN"><DepartmentsPage /></ProtectedRoute>} />
          <Route path="settings"    element={<ProtectedRoute minRole="ADMIN"><SettingsPage /></ProtectedRoute>} />
          <Route path="permissions" element={<ProtectedRoute minRole="SUPERADMIN"><PermissionsPage /></ProtectedRoute>} />
          <Route path="audit-logs"  element={<ProtectedRoute minRole="SUPERADMIN"><AuditLogPage /></ProtectedRoute>} />

          {/* CRM */}
          <Route path="crm/dashboard"   element={<CRMDashboardPage />} />
          <Route path="crm/leads"       element={<LeadsPage />} />
          <Route path="crm/leads/:id"   element={<LeadDetailPage />} />
          <Route path="crm/clients"     element={<ClientsPage />} />
          <Route path="crm/clients/:id" element={<ClientDetailPage />} />
          <Route path="crm/reports"     element={<ProtectedRoute minRole="SUBADMIN"><CRMReportsPage /></ProtectedRoute>} />

          {/* DM */}
          <Route path="dm/daily"                          element={<DMDailyDashboard />} />
          <Route path="dm/head"                           element={<ProtectedRoute minRole="DEPT_HEAD"><DMHeadDashboard /></ProtectedRoute>} />
          <Route path="dm/config"                         element={<ProtectedRoute minRole="ADMIN"><DMConfigPage /></ProtectedRoute>} />
          <Route path="dm/clients/:clientId/setup"        element={<ProtectedRoute minRole="ADMIN"><ClientDMSetupPage /></ProtectedRoute>} />
          <Route path="dm/audit-reports"                  element={<DMAuditReportsPage />} />
          <Route path="dm/audit-reports/compare"          element={<DMAuditComparePage />} />
          <Route path="dm/audit-reports/:id/fill"         element={<DMAuditFillPage />} />
          <Route path="dm/gd-queue"                       element={<DMGDQueuePage />} />

          {/* HR — Candidates */}
          <Route path="hr/candidates"          element={<ProtectedRoute minRole="DEPT_HEAD"><CandidateListPage /></ProtectedRoute>} />
          <Route path="hr/candidates/new"      element={<ProtectedRoute minRole="DEPT_HEAD"><AddCandidatePage /></ProtectedRoute>} />
          <Route path="hr/candidates/import"   element={<ProtectedRoute minRole="DEPT_HEAD"><BulkImportPage /></ProtectedRoute>} />
          <Route path="hr/candidates/rejected" element={<ProtectedRoute minRole="DEPT_HEAD"><RejectedPoolPage /></ProtectedRoute>} />
          <Route path="hr/candidates/:id"      element={<ProtectedRoute minRole="DEPT_HEAD"><CandidateDetailPage /></ProtectedRoute>} />

          {/* HR — Employees */}
          <Route path="hr/employees"           element={<ProtectedRoute minRole="DEPT_HEAD"><EmployeeDirectoryPage /></ProtectedRoute>} />
          <Route path="hr/employees/onboard"   element={<ProtectedRoute minRole="ADMIN"><OnboardingWizardPage /></ProtectedRoute>} />
          <Route path="hr/employees/:id"       element={<ProtectedRoute minRole="DEPT_HEAD"><EmployeeDetailPage /></ProtectedRoute>} />
          <Route path="hr/me"                  element={<EmployeeSelfServicePage />} />

          {/* HR — Attendance & Leave */}
          <Route path="hr/attendance/me"       element={<MyAttendancePage />} />
          <Route path="hr/attendance"          element={<ProtectedRoute minRole="DEPT_HEAD"><HRAttendancePage /></ProtectedRoute>} />
          <Route path="hr/leaves/me"           element={<MyLeavesPage />} />
          <Route path="hr/leaves/approvals"    element={<ProtectedRoute minRole="DEPT_HEAD"><LeaveApprovalsPage /></ProtectedRoute>} />
          <Route path="hr/holidays"            element={<ProtectedRoute minRole="ADMIN"><HolidayCalendarPage /></ProtectedRoute>} />
          <Route path="hr/leave-types"         element={<ProtectedRoute minRole="ADMIN"><LeaveTypeConfigPage /></ProtectedRoute>} />

          {/* Dev */}
          <Route path="dev/dashboard"    element={<DevDeveloperDashboardPage />} />
          <Route path="dev/head"         element={<ProtectedRoute minRole="DEPT_HEAD"><DevHeadDashboardPage /></ProtectedRoute>} />
          <Route path="dev/projects"     element={<DevProjectListPage />} />
          <Route path="dev/projects/:id" element={<DevProjectDetailPage />} />
          <Route path="dev/handovers"    element={<ProtectedRoute minRole="DEPT_HEAD"><DevHandoverInboxPage /></ProtectedRoute>} />

          {/* GD */}
          <Route path="gd/dashboard"  element={<GDDesignerDashboard />} />
          <Route path="gd/tasks"      element={<GDTaskInboxPage />} />
          <Route path="gd/tasks/:id"  element={<GDTaskDetailPage />} />
          <Route path="gd/head"       element={<ProtectedRoute minRole="DEPT_HEAD"><GDHeadDashboard /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return <AppRoutes />
}
