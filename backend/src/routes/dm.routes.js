const router = require('express').Router();
const auth   = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const ctrl   = require('../controllers/dm.controller');

router.use(auth);

// ── Platforms (master config) ──────────────────────────────────────────────────
router.get   ('/platforms',                    requirePermission('dm:platform:view'),    ctrl.listPlatforms);
router.post  ('/platforms',                    requirePermission('dm:platform:manage'),  ctrl.createPlatform);
router.patch ('/platforms/:id',                requirePermission('dm:platform:manage'),  ctrl.updatePlatform);
router.delete('/platforms/:id',                requirePermission('dm:platform:manage'),  ctrl.deletePlatform);

// ── Tasks per platform ─────────────────────────────────────────────────────────
router.get   ('/platforms/:platformId/tasks',           requirePermission('dm:platform:view'),   ctrl.listTasks);
router.post  ('/platforms/:platformId/tasks',           requirePermission('dm:platform:manage'), ctrl.createTask);
router.patch ('/platforms/:platformId/tasks/reorder',   requirePermission('dm:platform:manage'), ctrl.reorderTasks);
router.patch ('/platforms/:platformId/tasks/:taskId',   requirePermission('dm:platform:manage'), ctrl.updateTask);
router.delete('/platforms/:platformId/tasks/:taskId',   requirePermission('dm:platform:manage'), ctrl.deleteTask);

// ── Custom Fields per platform ────────────────────────────────────────────────
router.get   ('/platforms/:platformId/custom-fields',           requirePermission('dm:platform:view'),      ctrl.listCustomFields);
router.post  ('/platforms/:platformId/custom-fields',           requirePermission('dm:custom_field:manage'), ctrl.createCustomField);
router.patch ('/platforms/:platformId/custom-fields/:fieldId',  requirePermission('dm:custom_field:manage'), ctrl.updateCustomField);
router.delete('/platforms/:platformId/custom-fields/:fieldId',  requirePermission('dm:custom_field:manage'), ctrl.deleteCustomField);

// ── Client Platform Mapping ────────────────────────────────────────────────────
router.get   ('/clients/:clientId/platforms',                   requirePermission('dm:client_platform:view'),   ctrl.getClientPlatforms);
router.post  ('/clients/:clientId/platforms',                   requirePermission('dm:client_platform:manage'), ctrl.addClientPlatform);
router.patch ('/clients/:clientId/platforms/:mappingId',        requirePermission('dm:client_platform:manage'), ctrl.updateClientPlatform);
router.delete('/clients/:clientId/platforms/:mappingId',        requirePermission('dm:client_platform:manage'), ctrl.removeClientPlatform);

// ── Daily Logs ────────────────────────────────────────────────────────────────
router.get ('/daily-logs',      requirePermission('dm:daily_log:view'),   ctrl.getDailyLogs);
router.post('/daily-logs',      requirePermission('dm:daily_log:create'), ctrl.logTask);
router.get ('/daily-dashboard', requirePermission('dm:daily_log:view'),   ctrl.getDailyDashboard);
router.get ('/head-dashboard',  requirePermission('dm:daily_log:view'),   ctrl.getHeadDashboard);

// ── DM ↔ GD Integration ───────────────────────────────────────────────────────
router.get ('/gd-pipeline',     requirePermission('dm:daily_log:view'),   ctrl.getDMGDPipeline);
router.post('/gd-tasks',        requirePermission('gd:task:create'),      ctrl.createGDTask);

module.exports = router;
