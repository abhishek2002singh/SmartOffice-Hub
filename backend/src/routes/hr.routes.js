const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const auth                  = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const ctrl  = require('../controllers/hr.controller');
const attCtrl = require('../controllers/attendance.controller');

router.use(auth);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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

module.exports = router;
