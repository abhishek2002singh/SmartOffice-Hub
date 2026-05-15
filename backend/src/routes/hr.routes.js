const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const auth                  = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const ctrl  = require('../controllers/hr.controller');
const attCtrl = require('../controllers/attendance.controller');

router.use(auth);

const BLOCKED_EXT = /\.(exe|bat|cmd|sh|ps1|vbs|js|jar|msi|com|scr|pif|reg|dll)$/i;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (BLOCKED_EXT.test(file.originalname)) return cb(new Error('File type not allowed'));
    cb(null, true);
  },
});

// ── HR Config ─────────────────────────────────────────────────────────────────
router.get  ('/config',        requirePermission('hr:config:read'),   ctrl.getHRConfig);
router.patch('/config',        requirePermission('hr:config:update'), ctrl.updateHRConfig);

// ── Candidates ────────────────────────────────────────────────────────────────
router.get   ('/candidates',              requirePermission('hr:candidate:read'),   ctrl.listCandidates);
router.post  ('/candidates',              requirePermission('hr:candidate:create'), ctrl.createCandidate);
router.post  ('/candidates/bulk-import',  requirePermission('hr:bulk_import:create'), upload.single('file'), ctrl.bulkImport);
router.get   ('/candidates/:id',          requirePermission('hr:candidate:read'),   ctrl.getCandidate);
router.patch ('/candidates/:id',          requirePermission('hr:candidate:update'), ctrl.updateCandidate);
router.patch ('/candidates/:id/status',   requirePermission('hr:candidate:update'), ctrl.updateStatus);
router.delete('/candidates/:id',          requirePermission('hr:candidate:delete'), ctrl.deleteCandidate);

// ── Follow-ups ────────────────────────────────────────────────────────────────
router.get   ('/candidates/:id/followups',               requirePermission('hr:followup:read'),   ctrl.listFollowups);
router.post  ('/candidates/:id/followups',               requirePermission('hr:followup:create'), ctrl.createFollowup);
router.patch ('/candidates/:id/followups/:followupId',   requirePermission('hr:followup:update'), ctrl.updateFollowup);
router.delete('/candidates/:id/followups/:followupId',   requirePermission('hr:followup:delete'), ctrl.deleteFollowup);

// ── Interviews ────────────────────────────────────────────────────────────────
router.get   ('/candidates/:id/interviews',                requirePermission('hr:interview:read'),   ctrl.listInterviews);
router.post  ('/candidates/:id/interviews',                requirePermission('hr:interview:create'), ctrl.createInterview);
router.patch ('/candidates/:id/interviews/:interviewId',   requirePermission('hr:interview:update'), ctrl.updateInterview);
router.delete('/candidates/:id/interviews/:interviewId',   requirePermission('hr:interview:delete'), ctrl.deleteInterview);

// ── Interview Scheduler (calendar view across all candidates) ─────────────────
router.get('/interviews/schedule', requirePermission('hr:interview:read'), ctrl.interviewSchedule);

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/dashboard', requirePermission('hr:candidate:read'), ctrl.hrDashboard);

// ── WEEK 16 — Employees ───────────────────────────────────────────────────────
router.post  ('/employees/onboard/:candidateId', requirePermission('hr:employee:create'), ctrl.onboardEmployee);
router.get   ('/employees',                      requirePermission('hr:employee:read'),   ctrl.listEmployees);
router.get   ('/employees/:id',                  requirePermission('hr:employee:read'),   ctrl.getEmployee);
router.patch ('/employees/:id',                  requirePermission('hr:employee:update'), ctrl.updateEmployee);
router.post  ('/employees/:id/exit',             requirePermission('hr:employee:exit'),   ctrl.initiateExit);

// ── Employee Documents ────────────────────────────────────────────────────────
router.get   ('/employees/:id/documents',          requirePermission('hr:document:read'),   ctrl.listDocuments);
router.post  ('/employees/:id/documents', upload.single('file'), requirePermission('hr:document:create'), ctrl.uploadDocument);
router.delete('/employees/:id/documents/:docId',   requirePermission('hr:document:create'), ctrl.deleteDocument);

// ── Employee Family Members ───────────────────────────────────────────────────
router.get   ('/employees/:id/family',              requirePermission('hr:employee:read'),   ctrl.listFamilyMembers);
router.post  ('/employees/:id/family',              requirePermission('hr:employee:update'), ctrl.addFamilyMember);
router.patch ('/employees/:id/family/:memberId',    requirePermission('hr:employee:update'), ctrl.updateFamilyMember);
router.delete('/employees/:id/family/:memberId',    requirePermission('hr:employee:update'), ctrl.deleteFamilyMember);

// ── Self-Service (any logged-in employee) ─────────────────────────────────────
router.get   ('/me/profile', requirePermission('hr:self:read'),   ctrl.getMyProfile);
router.patch ('/me/profile', requirePermission('hr:self:update'), ctrl.updateMyProfile);

// ── WEEK 17 — Attendance ──────────────────────────────────────────────────────
router.post('/attendance/check-in',  requirePermission('hr:attendance:create'), attCtrl.checkIn);
router.post('/attendance/check-out', requirePermission('hr:attendance:create'), attCtrl.checkOut);
router.get ('/attendance/me',        requirePermission('hr:attendance:read'),   attCtrl.getMyAttendance);
router.get ('/attendance',           requirePermission('hr:attendance:read'),   attCtrl.getAttendance);
router.post('/attendance/manual',    requirePermission('hr:attendance:update'), attCtrl.manualAttendance);

// ── Holidays ──────────────────────────────────────────────────────────────────
router.get   ('/holidays',      requirePermission('hr:attendance:read'),   attCtrl.listHolidays);
router.post  ('/holidays',      requirePermission('hr:holiday:create'),    attCtrl.createHoliday);
router.patch ('/holidays/:id',  requirePermission('hr:holiday:update'),    attCtrl.updateHoliday);
router.delete('/holidays/:id',  requirePermission('hr:holiday:delete'),    attCtrl.deleteHoliday);

// ── Leave Types ───────────────────────────────────────────────────────────────
router.get   ('/leave-types',      requirePermission('hr:attendance:read'),   attCtrl.listLeaveTypes);
router.post  ('/leave-types',      requirePermission('hr:leave:update'),      attCtrl.createLeaveType);
router.patch ('/leave-types/:id',  requirePermission('hr:leave:update'),      attCtrl.updateLeaveType);
router.delete('/leave-types/:id',  requirePermission('hr:leave:update'),      attCtrl.deleteLeaveType);

// ── Leave Balances ────────────────────────────────────────────────────────────
router.get('/employees/:id/leave-balances', requirePermission('hr:leave:read'), attCtrl.getLeaveBalances);
router.get('/employees/:id/leave-history',  requirePermission('hr:leave:read'), attCtrl.getLeaveHistory);

// ── Leave Requests ────────────────────────────────────────────────────────────
// Team view must be before :id routes to avoid collision
router.get  ('/leave-requests/team',        requirePermission('hr:leave:read'),   attCtrl.getTeamLeaveRequests);
router.get  ('/me/leave-requests',          requirePermission('hr:leave:read'),   attCtrl.getMyLeaveRequests);
router.post ('/leave-requests',             requirePermission('hr:leave:create'), attCtrl.applyLeave);
router.patch('/leave-requests/:id/review',  requirePermission('hr:leave:update'), attCtrl.reviewLeave);
router.patch('/leave-requests/:id/cancel',  requirePermission('hr:leave:create'), attCtrl.cancelLeave);

// ── WEEK 19 — Performance ────────────────────────────────────────────────────
const perfCtrl = require('../controllers/performance.controller');

// KRAs
router.get   ('/kras',       requirePermission('hr:performance:read'),   perfCtrl.listKRAs);
router.post  ('/kras',       requirePermission('hr:performance:update'), perfCtrl.createKRA);
router.patch ('/kras/:id',   requirePermission('hr:performance:update'), perfCtrl.updateKRA);
router.delete('/kras/:id',   requirePermission('hr:performance:update'), perfCtrl.deleteKRA);

// Performance Cycles
router.get   ('/performance-cycles',      requirePermission('hr:performance:read'),   perfCtrl.listCycles);
router.post  ('/performance-cycles',      requirePermission('hr:performance:update'), perfCtrl.createCycle);
router.get   ('/performance-cycles/:id',  requirePermission('hr:performance:read'),   perfCtrl.getCycle);
router.patch ('/performance-cycles/:id',  requirePermission('hr:performance:update'), perfCtrl.updateCycle);

// Goals (per employee)
router.get   ('/employees/:id/goals',              requirePermission('hr:performance:read'),   perfCtrl.listGoals);
router.post  ('/employees/:id/goals',              requirePermission('hr:performance:update'), perfCtrl.setGoals);
router.patch ('/employees/:id/goals/:goalId',      requirePermission('hr:performance:update'), perfCtrl.updateGoal);
router.delete('/employees/:id/goals/:goalId',      requirePermission('hr:performance:update'), perfCtrl.deleteGoal);

// Self Evaluation (own employee)
router.get  ('/me/evaluations/:cycleId',  requirePermission('hr:self:read'),              perfCtrl.getMySelfEvaluation);
router.post ('/me/evaluations/:cycleId',  requirePermission('hr:self:evaluation:create'), perfCtrl.saveSelfEvaluation);

// Manager Evaluation
router.post('/employees/:employeeId/manager-evaluation/:cycleId', requirePermission('hr:performance:update'), perfCtrl.saveManagerEvaluation);
router.get ('/employees/:employeeId/manager-evaluation/:cycleId', requirePermission('hr:performance:read'),   perfCtrl.getManagerEvaluation);

// Combined performance view (self + manager + peers)
router.get('/employees/:employeeId/performance/:cycleId', requirePermission('hr:performance:read'), perfCtrl.getPerformanceView);

// Peer Feedback
router.post('/peer-feedback',                       requirePermission('hr:peer:create'),       perfCtrl.submitPeerFeedback);
router.get ('/employees/:employeeId/peer-feedback', requirePermission('hr:performance:read'),  perfCtrl.listPeerFeedback);

// 1-on-1 Meetings
router.get  ('/one-on-ones',      requirePermission('hr:performance:read'),   perfCtrl.listOneOnOnes);
router.post ('/one-on-ones',      requirePermission('hr:performance:update'), perfCtrl.createOneOnOne);
router.patch('/one-on-ones/:id',  requirePermission('hr:performance:update'), perfCtrl.updateOneOnOne);

// PIP
router.post  ('/pips',              requirePermission('hr:performance:update'), perfCtrl.createPIP);
router.get   ('/pips',              requirePermission('hr:performance:read'),   perfCtrl.listPIPs);
router.get   ('/pips/:id',          requirePermission('hr:performance:read'),   perfCtrl.getPIP);
router.post  ('/pips/:id/reviews',  requirePermission('hr:performance:update'), perfCtrl.addPIPReview);
router.patch ('/pips/:id/close',    requirePermission('hr:performance:update'), perfCtrl.closePIP);

// Performance Reports
router.get('/reports/performance',    requirePermission('hr:performance:read'), perfCtrl.getPerformanceReport);
router.get('/me/performance-history', requirePermission('hr:self:read'),         perfCtrl.getMyPerformanceHistory);

// ── WEEK 18 — Payroll ─────────────────────────────────────────────────────────
const payCtrl = require('../controllers/payroll.controller');

// Salary Structures (Superadmin/Admin)
router.get   ('/salary-structures',      requirePermission('hr:salary:read'),   payCtrl.listSalaryStructures);
router.post  ('/salary-structures',      requirePermission('hr:salary:update'), payCtrl.createSalaryStructure);
router.get   ('/salary-structures/:id',  requirePermission('hr:salary:read'),   payCtrl.getSalaryStructure);
router.patch ('/salary-structures/:id',  requirePermission('hr:salary:update'), payCtrl.updateSalaryStructure);
router.delete('/salary-structures/:id',  requirePermission('hr:salary:update'), payCtrl.deleteSalaryStructure);

// Employee Salary Assignment
router.post('/employees/:id/salary',         requirePermission('hr:salary:update'), payCtrl.assignSalary);
router.get ('/employees/:id/salary-history', requirePermission('hr:salary:read'),   payCtrl.getSalaryHistory);

// Payroll Runs
router.post ('/payroll/process',     requirePermission('hr:payroll:process'), payCtrl.processPayroll);
router.get  ('/payroll',             requirePermission('hr:salary:read'),     payCtrl.listPayrollRuns);
router.get  ('/payroll/:id',         requirePermission('hr:salary:read'),     payCtrl.getPayrollRun);
router.patch('/payroll/:id/disburse',requirePermission('hr:payroll:disburse'),payCtrl.disbursePayroll);
router.get  ('/payroll/:id/bank-file',requirePermission('hr:payroll:disburse'),payCtrl.getBankFile);

// Payslips
router.get('/me/payslips',          requirePermission('hr:self:read'),   payCtrl.listMyPayslips);
router.get('/payslips/:id',         requirePermission('hr:self:read'),   payCtrl.getPayslip);
router.get('/payslips/:id/pdf',     requirePermission('hr:self:read'),   payCtrl.getPayslipPDF);

// Reimbursements
router.post ('/reimbursements',            requirePermission('hr:reimbursement:create'), payCtrl.submitReimbursement);
router.get  ('/reimbursements',            requirePermission('hr:reimbursement:read'),   payCtrl.listReimbursements);
router.patch('/reimbursements/:id/review', requirePermission('hr:reimbursement:update'), payCtrl.reviewReimbursement);

// Bonuses
router.post  ('/bonuses',      requirePermission('hr:bonus:create'), payCtrl.createBonus);
router.get   ('/bonuses',      requirePermission('hr:bonus:read'),   payCtrl.listBonuses);
router.patch ('/bonuses/:id',  requirePermission('hr:bonus:update'), payCtrl.updateBonus);
router.delete('/bonuses/:id',  requirePermission('hr:bonus:update'), payCtrl.deleteBonus);

// Form 16 placeholder
router.get('/employees/:id/form16', requirePermission('hr:salary:read'), payCtrl.getForm16);

// ── Exit Management (Week 20) ─────────────────────────────────────────────────
const exitCtrl = require('../controllers/exit.controller');

// Resignation (employee submits for themselves)
router.post('/me/resignation', requirePermission('hr:self:update'), exitCtrl.submitResignation);

// Exit Checklist
router.get  ('/employees/:id/exit-checklist',        requirePermission('hr:employee:read'),   exitCtrl.getExitChecklist);
router.patch('/employees/:id/exit-checklist',        requirePermission('hr:employee:update'), exitCtrl.updateExitChecklist);

// Exit Interview
router.post('/employees/:id/exit-interview',         requirePermission('hr:employee:update'), exitCtrl.saveExitInterview);
router.get ('/employees/:id/exit-interview',         requirePermission('hr:employee:read'),   exitCtrl.getExitInterview);

// Full & Final Settlement
router.post  ('/employees/:id/full-and-final',         requirePermission('hr:payroll:process'),  exitCtrl.calculateFnF);
router.get   ('/employees/:id/full-and-final',         requirePermission('hr:salary:read'),      exitCtrl.getFnF);
router.patch ('/employees/:id/full-and-final/approve', requirePermission('hr:payroll:process'),  exitCtrl.approveFnF);
router.patch ('/employees/:id/full-and-final/disburse',requirePermission('hr:payroll:disburse'), exitCtrl.disburseFnF);

// Exit Documents (PDFs)
router.get('/employees/:id/relieving-letter',    requirePermission('hr:employee:read'), exitCtrl.generateRelievingLetter);
router.get('/employees/:id/experience-letter',   requirePermission('hr:employee:read'), exitCtrl.generateExperienceLetter);

// HR Master Dashboard
router.get('/hr-dashboard', requirePermission('hr:employee:read'), exitCtrl.getHRDashboard);

module.exports = router;
