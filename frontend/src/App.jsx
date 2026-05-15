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
import SalaryStructurePage    from './modules/hr/pages/SalaryStructurePage'
import EmployeeSalaryPage     from './modules/hr/pages/EmployeeSalaryPage'
import PayrollRunPage         from './modules/hr/pages/PayrollRunPage'
import MyPayslipsPage         from './modules/hr/pages/MyPayslipsPage'
import ReimbursementsPage     from './modules/hr/pages/ReimbursementsPage'
import BonusManagementPage    from './modules/hr/pages/BonusManagementPage'
import PerformanceCycleSetupPage from './modules/hr/pages/PerformanceCycleSetupPage'
import KRAMasterPage           from './modules/hr/pages/KRAMasterPage'
import GoalSettingPage         from './modules/hr/pages/GoalSettingPage'
import SelfEvaluationPage      from './modules/hr/pages/SelfEvaluationPage'
import ManagerEvaluationPage   from './modules/hr/pages/ManagerEvaluationPage'
import PeerFeedbackPage        from './modules/hr/pages/PeerFeedbackPage'
import OneOnOnePage            from './modules/hr/pages/OneOnOnePage'
import PIPPage                 from './modules/hr/pages/PIPPage'
import PerformanceDashboardPage from './modules/hr/pages/PerformanceDashboardPage'
import ResignationPage         from './modules/hr/pages/ResignationPage'
import ExitWorkflowPage        from './modules/hr/pages/ExitWorkflowPage'
import ExitInterviewPage       from './modules/hr/pages/ExitInterviewPage'
import FullAndFinalPage        from './modules/hr/pages/FullAndFinalPage'
import HRMasterDashboardPage   from './modules/hr/pages/HRMasterDashboardPage'

import SOPLibraryPage      from './modules/sops/pages/SOPLibraryPage'
import SOPDetailPage       from './modules/sops/pages/SOPDetailPage'
import SOPEditorPage       from './modules/sops/pages/SOPEditorPage'
import SOPCategoriesPage   from './modules/sops/pages/SOPCategoriesPage'
import SOPApprovalInboxPage from './modules/sops/pages/SOPApprovalInboxPage'
import MySOPsPage          from './modules/sops/pages/MySOPsPage'
import SOPAcknowledgementMatrixPage from './modules/sops/pages/SOPAcknowledgementMatrixPage'

import MyOnboardingPage         from './modules/hr/pages/MyOnboardingPage'
import OnboardingTemplatesPage  from './modules/hr/pages/OnboardingTemplatesPage'
import OnboardingProgressPage   from './modules/hr/pages/OnboardingProgressPage'

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

          {/* HR — Payroll (Week 18) */}
          <Route path="hr/salary-structures"  element={<ProtectedRoute minRole="ADMIN"><SalaryStructurePage /></ProtectedRoute>} />
          <Route path="hr/employees/:id/salary" element={<ProtectedRoute minRole="ADMIN"><EmployeeSalaryPage /></ProtectedRoute>} />
          <Route path="hr/payroll"            element={<ProtectedRoute minRole="ADMIN"><PayrollRunPage /></ProtectedRoute>} />
          <Route path="hr/me/payslips"        element={<MyPayslipsPage />} />
          <Route path="hr/reimbursements"     element={<ReimbursementsPage />} />
          <Route path="hr/bonuses"            element={<ProtectedRoute minRole="ADMIN"><BonusManagementPage /></ProtectedRoute>} />

          {/* Performance (Week 19) */}
          <Route path="hr/performance-cycles" element={<ProtectedRoute minRole="ADMIN"><PerformanceCycleSetupPage /></ProtectedRoute>} />
          <Route path="hr/kras"               element={<ProtectedRoute minRole="DEPT_HEAD"><KRAMasterPage /></ProtectedRoute>} />
          <Route path="hr/employees/:id/goals" element={<GoalSettingPage />} />
          <Route path="hr/me/evaluation"      element={<SelfEvaluationPage />} />
          <Route path="hr/employees/:id/manager-evaluation" element={<ProtectedRoute minRole="DEPT_HEAD"><ManagerEvaluationPage /></ProtectedRoute>} />
          <Route path="hr/peer-feedback"      element={<PeerFeedbackPage />} />
          <Route path="hr/one-on-ones"        element={<OneOnOnePage />} />
          <Route path="hr/pips"               element={<ProtectedRoute minRole="DEPT_HEAD"><PIPPage /></ProtectedRoute>} />
          <Route path="hr/performance"        element={<PerformanceDashboardPage />} />

          {/* Exit Management (Week 20) */}
          <Route path="hr/me/resignation"                          element={<ResignationPage />} />
          <Route path="hr/employees/:id/exit-workflow"             element={<ProtectedRoute minRole="DEPT_HEAD"><ExitWorkflowPage /></ProtectedRoute>} />
          <Route path="hr/employees/:id/exit-interview"            element={<ProtectedRoute minRole="DEPT_HEAD"><ExitInterviewPage /></ProtectedRoute>} />
          <Route path="hr/employees/:id/full-and-final"            element={<ProtectedRoute minRole="ADMIN"><FullAndFinalPage /></ProtectedRoute>} />
          <Route path="hr/dashboard"                               element={<ProtectedRoute minRole="ADMIN"><HRMasterDashboardPage /></ProtectedRoute>} />

          {/* SOPs */}
          <Route path="sops"                   element={<SOPLibraryPage />} />
          <Route path="sops/me"                element={<MySOPsPage />} />
          <Route path="sops/new"               element={<SOPEditorPage />} />
          <Route path="sops/categories"        element={<SOPCategoriesPage />} />
          <Route path="sops/approvals"         element={<SOPApprovalInboxPage />} />
          <Route path="sops/ack-matrix"        element={<ProtectedRoute minRole="DEPT_HEAD"><SOPAcknowledgementMatrixPage /></ProtectedRoute>} />
          <Route path="sops/:id"               element={<SOPDetailPage />} />
          <Route path="sops/:id/edit"          element={<SOPEditorPage />} />

          {/* Onboarding */}
          <Route path="hr/me/onboarding"            element={<MyOnboardingPage />} />
          <Route path="hr/onboarding-templates"     element={<ProtectedRoute minRole="ADMIN"><OnboardingTemplatesPage /></ProtectedRoute>} />
          <Route path="hr/onboarding-progress"      element={<ProtectedRoute minRole="DEPT_HEAD"><OnboardingProgressPage /></ProtectedRoute>} />

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
