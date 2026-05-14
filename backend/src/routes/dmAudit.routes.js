const router = require('express').Router();
const auth   = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const ctrl   = require('../controllers/dmAudit.controller');

router.use(auth);

// ── Audit Metrics Master ───────────────────────────────────────────────────────
router.get   ('/platforms/:platformId/audit-metrics',              requirePermission('dm:platform:view'),    ctrl.listMetrics);
router.post  ('/platforms/:platformId/audit-metrics',              requirePermission('dm:platform:manage'),  ctrl.createMetric);
router.patch ('/platforms/:platformId/audit-metrics/:metricId',    requirePermission('dm:platform:manage'),  ctrl.updateMetric);
router.delete('/platforms/:platformId/audit-metrics/:metricId',    requirePermission('dm:platform:manage'),  ctrl.deleteMetric);

// ── Audit Reports ──────────────────────────────────────────────────────────────
router.get   ('/audit-reports',              requirePermission('dm:report:view'),     ctrl.listReports);
router.post  ('/audit-reports',              requirePermission('dm:report:generate'), ctrl.generateReport);
router.get   ('/audit-reports/compare',      requirePermission('dm:report:view'),     ctrl.compareReports);
router.get   ('/audit-reports/:id',          requirePermission('dm:report:view'),     ctrl.getReport);
router.patch ('/audit-reports/:id/entries',  requirePermission('dm:report:generate'), ctrl.saveEntries);
router.patch ('/audit-reports/:id/publish',  requirePermission('dm:report:generate'), ctrl.publishReport);
router.delete('/audit-reports/:id',          requirePermission('dm:report:generate'), ctrl.deleteReport);
router.get   ('/audit-reports/:id/export',   requirePermission('dm:report:view'),     ctrl.exportPDF);

module.exports = router;
