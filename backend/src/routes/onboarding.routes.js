const express = require('express');
const router  = express.Router();
const auth                  = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const ctrl = require('../controllers/onboarding.controller');

router.use(auth);

// ─── Employee self-service (must come before /:id) ───────────────────────────
router.get ('/me',                           ctrl.getMyOnboarding);

// ─── Assign checklist to an employee ─────────────────────────────────────────
router.post('/assign',     requirePermission('hr:employee:update'), ctrl.assignOnboarding);

// ─── HR view — all progress ───────────────────────────────────────────────────
router.get('/progress/all',requirePermission('hr:employee:read'),   ctrl.listAllProgress);

// ─── HR view — specific employee's progress ──────────────────────────────────
router.get('/progress/employee/:employeeId', requirePermission('hr:employee:read'), ctrl.getEmployeeOnboarding);

// ─── Item completion ──────────────────────────────────────────────────────────
router.patch('/:progressId/items/:itemId/complete', ctrl.markItemComplete);

// ─── Templates (HR/Admin) — param routes last ─────────────────────────────────
router.get   ('/',         requirePermission('hr:employee:read'),   ctrl.listTemplates);
router.post  ('/',         requirePermission('hr:employee:create'), ctrl.createTemplate);
router.get   ('/:id',      requirePermission('hr:employee:read'),   ctrl.getTemplate);
router.patch ('/:id',      requirePermission('hr:employee:update'), ctrl.updateTemplate);
router.delete('/:id',      requirePermission('hr:employee:delete'), ctrl.deleteTemplate);

module.exports = router;
