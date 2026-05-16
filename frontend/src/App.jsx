import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { fetchMeThunk } from './store/authSlice'
import ProtectedRoute from './components/ProtectedRoute'
import MasterLayout from './components/layout/MasterLayout'
import ErrorBoundary from './components/ErrorBoundary'

// ─── Eager: shell pages that are tiny and always needed ───────────────────────
import LoginPage from './pages/LoginPage'

// ─── Lazy: all feature pages (code-split by route) ───────────────────────────
const DashboardPage        = lazy(() => import('./pages/DashboardPage'))
const MasterDashboardPage  = lazy(() => import('./pages/MasterDashboardPage'))
const UsersPage            = lazy(() => import('./pages/UsersPage'))
const DepartmentsPage      = lazy(() => import('./pages/DepartmentsPage'))
const PermissionsPage      = lazy(() => import('./pages/PermissionsPage'))
const AuditLogPage         = lazy(() => import('./pages/AuditLogPage'))
const SettingsPage         = lazy(() => import('./pages/SettingsPage'))
const ProfilePage          = lazy(() => import('./pages/ProfilePage'))

const LeadsPage        = lazy(() => import('./modules/crm/pages/LeadsPage'))
const LeadDetailPage   = lazy(() => import('./modules/crm/pages/LeadDetailPage'))
const ClientsPage      = lazy(() => import('./modules/crm/pages/ClientsPage'))
const ClientDetailPage = lazy(() => import('./modules/crm/pages/ClientDetailPage'))
const CRMDashboardPage = lazy(() => import('./modules/crm/pages/CRMDashboardPage'))
const CRMReportsPage   = lazy(() => import('./modules/crm/pages/CRMReportsPage'))

const DMDailyDashboard   = lazy(() => import('./modules/dm/pages/DMDailyDashboard'))
const DMHeadDashboard    = lazy(() => import('./modules/dm/pages/DMHeadDashboard'))
const DMConfigPage       = lazy(() => import('./modules/dm/pages/DMConfigPage'))
const ClientDMSetupPage  = lazy(() => import('./modules/dm/pages/ClientDMSetupPage'))
const DMAuditReportsPage = lazy(() => import('./modules/dm/pages/DMAuditReportsPage'))
const DMAuditFillPage    = lazy(() => import('./modules/dm/pages/DMAuditFillPage'))
const DMAuditComparePage = lazy(() => import('./modules/dm/pages/DMAuditComparePage'))
const DMGDQueuePage      = lazy(() => import('./modules/dm/pages/DMGDQueuePage'))

const CandidateListPage       = lazy(() => import('./modules/hr/pages/CandidateListPage'))
const CandidateDetailPage     = lazy(() => import('./modules/hr/pages/CandidateDetailPage'))
const AddCandidatePage        = lazy(() => import('./modules/hr/pages/AddCandidatePage'))
const BulkImportPage          = lazy(() => import('./modules/hr/pages/BulkImportPage'))
const RejectedPoolPage        = lazy(() => import('./modules/hr/pages/RejectedPoolPage'))
const EmployeeDirectoryPage   = lazy(() => import('./modules/hr/pages/EmployeeDirectoryPage'))
const EmployeeDetailPage      = lazy(() => import('./modules/hr/pages/EmployeeDetailPage'))
const OnboardingWizardPage    = lazy(() => import('./modules/hr/pages/OnboardingWizardPage'))
const EmployeeSelfServicePage = lazy(() => import('./modules/hr/pages/EmployeeSelfServicePage'))
const MyAttendancePage        = lazy(() => import('./modules/hr/pages/MyAttendancePage'))
const MyLeavesPage            = lazy(() => import('./modules/hr/pages/MyLeavesPage'))
const LeaveApprovalsPage      = lazy(() => import('./modules/hr/pages/LeaveApprovalsPage'))
const HRAttendancePage        = lazy(() => import('./modules/hr/pages/HRAttendancePage'))
const HolidayCalendarPage     = lazy(() => import('./modules/hr/pages/HolidayCalendarPage'))
const LeaveTypeConfigPage     = lazy(() => import('./modules/hr/pages/LeaveTypeConfigPage'))
const SalaryStructurePage     = lazy(() => import('./modules/hr/pages/SalaryStructurePage'))
const EmployeeSalaryPage      = lazy(() => import('./modules/hr/pages/EmployeeSalaryPage'))
const PayrollRunPage          = lazy(() => import('./modules/hr/pages/PayrollRunPage'))
const MyPayslipsPage          = lazy(() => import('./modules/hr/pages/MyPayslipsPage'))
const ReimbursementsPage      = lazy(() => import('./modules/hr/pages/ReimbursementsPage'))
const BonusManagementPage     = lazy(() => import('./modules/hr/pages/BonusManagementPage'))
const PerformanceCycleSetupPage = lazy(() => import('./modules/hr/pages/PerformanceCycleSetupPage'))
const KRAMasterPage           = lazy(() => import('./modules/hr/pages/KRAMasterPage'))
const GoalSettingPage         = lazy(() => import('./modules/hr/pages/GoalSettingPage'))
const SelfEvaluationPage      = lazy(() => import('./modules/hr/pages/SelfEvaluationPage'))
const ManagerEvaluationPage   = lazy(() => import('./modules/hr/pages/ManagerEvaluationPage'))
const PeerFeedbackPage        = lazy(() => import('./modules/hr/pages/PeerFeedbackPage'))
const OneOnOnePage            = lazy(() => import('./modules/hr/pages/OneOnOnePage'))
const PIPPage                 = lazy(() => import('./modules/hr/pages/PIPPage'))
const PerformanceDashboardPage = lazy(() => import('./modules/hr/pages/PerformanceDashboardPage'))
const ResignationPage         = lazy(() => import('./modules/hr/pages/ResignationPage'))
const ExitWorkflowPage        = lazy(() => import('./modules/hr/pages/ExitWorkflowPage'))
const ExitInterviewPage       = lazy(() => import('./modules/hr/pages/ExitInterviewPage'))
const FullAndFinalPage        = lazy(() => import('./modules/hr/pages/FullAndFinalPage'))
const HRMasterDashboardPage   = lazy(() => import('./modules/hr/pages/HRMasterDashboardPage'))
const MyOnboardingPage        = lazy(() => import('./modules/hr/pages/MyOnboardingPage'))
const OnboardingTemplatesPage = lazy(() => import('./modules/hr/pages/OnboardingTemplatesPage'))
const OnboardingProgressPage  = lazy(() => import('./modules/hr/pages/OnboardingProgressPage'))

const SOPLibraryPage               = lazy(() => import('./modules/sops/pages/SOPLibraryPage'))
const SOPDetailPage                = lazy(() => import('./modules/sops/pages/SOPDetailPage'))
const SOPEditorPage                = lazy(() => import('./modules/sops/pages/SOPEditorPage'))
const SOPCategoriesPage            = lazy(() => import('./modules/sops/pages/SOPCategoriesPage'))
const SOPApprovalInboxPage         = lazy(() => import('./modules/sops/pages/SOPApprovalInboxPage'))
const MySOPsPage                   = lazy(() => import('./modules/sops/pages/MySOPsPage'))
const SOPAcknowledgementMatrixPage = lazy(() => import('./modules/sops/pages/SOPAcknowledgementMatrixPage'))

const DevProjectListPage        = lazy(() => import('./modules/dev/pages/DevProjectListPage'))
const DevProjectDetailPage      = lazy(() => import('./modules/dev/pages/DevProjectDetailPage'))
const DevHandoverInboxPage      = lazy(() => import('./modules/dev/pages/DevHandoverInboxPage'))
const DevDeveloperDashboardPage = lazy(() => import('./modules/dev/pages/DevDeveloperDashboardPage'))
const DevHeadDashboardPage      = lazy(() => import('./modules/dev/pages/DevHeadDashboardPage'))

const GDDesignerDashboard = lazy(() => import('./modules/gd/pages/GDDesignerDashboard'))
const GDHeadDashboard     = lazy(() => import('./modules/gd/pages/GDHeadDashboard'))
const GDTaskInboxPage     = lazy(() => import('./modules/gd/pages/GDTaskInboxPage'))
const GDTaskDetailPage    = lazy(() => import('./modules/gd/pages/GDTaskDetailPage'))

// ─── Page loading fallback ───────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-gray-500 text-xs">Loading…</p>
      </div>
    </div>
  )
}

function L({ children }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ErrorBoundary>
  )
}

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
          <Route path="dashboard"         element={<L><DashboardPage /></L>} />
          <Route path="master-dashboard"  element={<ProtectedRoute minRole="ADMIN"><L><MasterDashboardPage /></L></ProtectedRoute>} />
          <Route path="profile"     element={<L><ProfilePage /></L>} />
          <Route path="users"       element={<ProtectedRoute minRole="ADMIN"><L><UsersPage /></L></ProtectedRoute>} />
          <Route path="departments" element={<ProtectedRoute minRole="ADMIN"><L><DepartmentsPage /></L></ProtectedRoute>} />
          <Route path="settings"    element={<ProtectedRoute minRole="ADMIN"><L><SettingsPage /></L></ProtectedRoute>} />
          <Route path="permissions" element={<ProtectedRoute minRole="SUPERADMIN"><L><PermissionsPage /></L></ProtectedRoute>} />
          <Route path="audit-logs"  element={<ProtectedRoute minRole="SUPERADMIN"><L><AuditLogPage /></L></ProtectedRoute>} />

          {/* CRM — requires crm: permission */}
          <Route element={<ProtectedRoute requiredPermission="crm:"><Outlet /></ProtectedRoute>}>
            <Route path="crm/dashboard"   element={<L><CRMDashboardPage /></L>} />
            <Route path="crm/leads"       element={<L><LeadsPage /></L>} />
            <Route path="crm/leads/:id"   element={<L><LeadDetailPage /></L>} />
            <Route path="crm/clients"     element={<L><ClientsPage /></L>} />
            <Route path="crm/clients/:id" element={<L><ClientDetailPage /></L>} />
            <Route path="crm/reports"     element={<ProtectedRoute minRole="SUBADMIN"><L><CRMReportsPage /></L></ProtectedRoute>} />
          </Route>

          {/* DM — requires dm: permission */}
          <Route element={<ProtectedRoute requiredPermission="dm:"><Outlet /></ProtectedRoute>}>
            <Route path="dm/daily"                   element={<L><DMDailyDashboard /></L>} />
            <Route path="dm/head"                    element={<ProtectedRoute minRole="DEPT_HEAD"><L><DMHeadDashboard /></L></ProtectedRoute>} />
            <Route path="dm/config"                  element={<ProtectedRoute minRole="ADMIN"><L><DMConfigPage /></L></ProtectedRoute>} />
            <Route path="dm/clients/:clientId/setup" element={<ProtectedRoute minRole="ADMIN"><L><ClientDMSetupPage /></L></ProtectedRoute>} />
            <Route path="dm/audit-reports"           element={<L><DMAuditReportsPage /></L>} />
            <Route path="dm/audit-reports/compare"   element={<L><DMAuditComparePage /></L>} />
            <Route path="dm/audit-reports/:id/fill"  element={<L><DMAuditFillPage /></L>} />
            <Route path="dm/gd-queue"                element={<L><DMGDQueuePage /></L>} />
          </Route>

          {/* HR — Candidates */}
          <Route path="hr/candidates"          element={<ProtectedRoute minRole="DEPT_HEAD"><L><CandidateListPage /></L></ProtectedRoute>} />
          <Route path="hr/candidates/new"      element={<ProtectedRoute minRole="DEPT_HEAD"><L><AddCandidatePage /></L></ProtectedRoute>} />
          <Route path="hr/candidates/import"   element={<ProtectedRoute minRole="DEPT_HEAD"><L><BulkImportPage /></L></ProtectedRoute>} />
          <Route path="hr/candidates/rejected"  element={<ProtectedRoute minRole="DEPT_HEAD"><L><RejectedPoolPage /></L></ProtectedRoute>} />
          <Route path="hr/candidates/:id/edit" element={<ProtectedRoute minRole="DEPT_HEAD"><L><AddCandidatePage /></L></ProtectedRoute>} />
          <Route path="hr/candidates/:id"      element={<ProtectedRoute minRole="DEPT_HEAD"><L><CandidateDetailPage /></L></ProtectedRoute>} />

          {/* HR — Employees */}
          <Route path="hr/employees"             element={<ProtectedRoute minRole="DEPT_HEAD"><L><EmployeeDirectoryPage /></L></ProtectedRoute>} />
          <Route path="hr/employees/onboard"     element={<ProtectedRoute minRole="ADMIN"><L><OnboardingWizardPage /></L></ProtectedRoute>} />
          <Route path="hr/employees/:id"         element={<ProtectedRoute minRole="DEPT_HEAD"><L><EmployeeDetailPage /></L></ProtectedRoute>} />
          <Route path="hr/me"                    element={<L><EmployeeSelfServicePage /></L>} />

          {/* HR — Attendance & Leave */}
          <Route path="hr/attendance/me"       element={<L><MyAttendancePage /></L>} />
          <Route path="hr/attendance"          element={<ProtectedRoute minRole="DEPT_HEAD"><L><HRAttendancePage /></L></ProtectedRoute>} />
          <Route path="hr/leaves/me"           element={<L><MyLeavesPage /></L>} />
          <Route path="hr/leaves/approvals"    element={<ProtectedRoute minRole="DEPT_HEAD"><L><LeaveApprovalsPage /></L></ProtectedRoute>} />
          <Route path="hr/holidays"            element={<ProtectedRoute minRole="ADMIN"><L><HolidayCalendarPage /></L></ProtectedRoute>} />
          <Route path="hr/leave-types"         element={<ProtectedRoute minRole="ADMIN"><L><LeaveTypeConfigPage /></L></ProtectedRoute>} />

          {/* HR — Payroll */}
          <Route path="hr/salary-structures"     element={<ProtectedRoute minRole="ADMIN"><L><SalaryStructurePage /></L></ProtectedRoute>} />
          <Route path="hr/employees/:id/salary"  element={<ProtectedRoute minRole="ADMIN"><L><EmployeeSalaryPage /></L></ProtectedRoute>} />
          <Route path="hr/payroll"               element={<ProtectedRoute minRole="ADMIN"><L><PayrollRunPage /></L></ProtectedRoute>} />
          <Route path="hr/me/payslips"           element={<L><MyPayslipsPage /></L>} />
          <Route path="hr/reimbursements"        element={<L><ReimbursementsPage /></L>} />
          <Route path="hr/bonuses"               element={<ProtectedRoute minRole="ADMIN"><L><BonusManagementPage /></L></ProtectedRoute>} />

          {/* Performance */}
          <Route path="hr/performance-cycles"                        element={<ProtectedRoute minRole="ADMIN"><L><PerformanceCycleSetupPage /></L></ProtectedRoute>} />
          <Route path="hr/kras"                                      element={<ProtectedRoute minRole="DEPT_HEAD"><L><KRAMasterPage /></L></ProtectedRoute>} />
          <Route path="hr/employees/:id/goals"                       element={<L><GoalSettingPage /></L>} />
          <Route path="hr/me/evaluation"                             element={<L><SelfEvaluationPage /></L>} />
          <Route path="hr/employees/:id/manager-evaluation"          element={<ProtectedRoute minRole="DEPT_HEAD"><L><ManagerEvaluationPage /></L></ProtectedRoute>} />
          <Route path="hr/peer-feedback"                             element={<L><PeerFeedbackPage /></L>} />
          <Route path="hr/one-on-ones"                               element={<L><OneOnOnePage /></L>} />
          <Route path="hr/pips"                                      element={<ProtectedRoute minRole="DEPT_HEAD"><L><PIPPage /></L></ProtectedRoute>} />
          <Route path="hr/performance"                               element={<L><PerformanceDashboardPage /></L>} />

          {/* Exit Management */}
          <Route path="hr/me/resignation"                element={<L><ResignationPage /></L>} />
          <Route path="hr/employees/:id/exit-workflow"   element={<ProtectedRoute minRole="DEPT_HEAD"><L><ExitWorkflowPage /></L></ProtectedRoute>} />
          <Route path="hr/employees/:id/exit-interview"  element={<ProtectedRoute minRole="DEPT_HEAD"><L><ExitInterviewPage /></L></ProtectedRoute>} />
          <Route path="hr/employees/:id/full-and-final"  element={<ProtectedRoute minRole="ADMIN"><L><FullAndFinalPage /></L></ProtectedRoute>} />
          <Route path="hr/dashboard"                     element={<ProtectedRoute minRole="ADMIN"><L><HRMasterDashboardPage /></L></ProtectedRoute>} />

          {/* Onboarding */}
          <Route path="hr/me/onboarding"           element={<L><MyOnboardingPage /></L>} />
          <Route path="hr/onboarding-templates"    element={<ProtectedRoute minRole="ADMIN"><L><OnboardingTemplatesPage /></L></ProtectedRoute>} />
          <Route path="hr/onboarding-progress"     element={<ProtectedRoute minRole="DEPT_HEAD"><L><OnboardingProgressPage /></L></ProtectedRoute>} />

          {/* SOPs */}
          <Route path="sops"             element={<L><SOPLibraryPage /></L>} />
          <Route path="sops/me"          element={<L><MySOPsPage /></L>} />
          <Route path="sops/new"         element={<L><SOPEditorPage /></L>} />
          <Route path="sops/categories"  element={<L><SOPCategoriesPage /></L>} />
          <Route path="sops/approvals"   element={<L><SOPApprovalInboxPage /></L>} />
          <Route path="sops/ack-matrix"  element={<ProtectedRoute minRole="DEPT_HEAD"><L><SOPAcknowledgementMatrixPage /></L></ProtectedRoute>} />
          <Route path="sops/:id"         element={<L><SOPDetailPage /></L>} />
          <Route path="sops/:id/edit"    element={<L><SOPEditorPage /></L>} />

          {/* Dev — requires dev: permission */}
          <Route element={<ProtectedRoute requiredPermission="dev:"><Outlet /></ProtectedRoute>}>
            <Route path="dev/dashboard"    element={<L><DevDeveloperDashboardPage /></L>} />
            <Route path="dev/head"         element={<ProtectedRoute minRole="DEPT_HEAD"><L><DevHeadDashboardPage /></L></ProtectedRoute>} />
            <Route path="dev/projects"     element={<L><DevProjectListPage /></L>} />
            <Route path="dev/projects/:id" element={<L><DevProjectDetailPage /></L>} />
            <Route path="dev/handovers"    element={<ProtectedRoute minRole="DEPT_HEAD"><L><DevHandoverInboxPage /></L></ProtectedRoute>} />
          </Route>

          {/* GD — requires gd: permission */}
          <Route element={<ProtectedRoute requiredPermission="gd:"><Outlet /></ProtectedRoute>}>
            <Route path="gd/dashboard"  element={<L><GDDesignerDashboard /></L>} />
            <Route path="gd/tasks"      element={<L><GDTaskInboxPage /></L>} />
            <Route path="gd/tasks/:id"  element={<L><GDTaskDetailPage /></L>} />
            <Route path="gd/head"       element={<ProtectedRoute minRole="DEPT_HEAD"><L><GDHeadDashboard /></L></ProtectedRoute>} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return <AppRoutes />
}
