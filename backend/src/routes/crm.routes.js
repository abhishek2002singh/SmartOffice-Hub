const router  = require('express').Router();
const auth    = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const commCtrl    = require('../controllers/communication.controller');
const reportsCtrl = require('../controllers/reports.controller');

router.use(auth);

// ── Communications ────────────────────────────────────────────────────────────
router.post('/leads/:leadId/communications',    requirePermission('crm:lead:edit'), commCtrl.logComm);
router.get('/leads/:leadId/communications',     requirePermission('crm:lead:view'), commCtrl.listLeadComms);
router.get('/leads/:leadId/timeline',           requirePermission('crm:lead:view'), commCtrl.leadTimeline);

router.post('/clients/:clientId/communications', requirePermission('crm:client:edit'), commCtrl.logComm);
router.get('/clients/:clientId/communications',  requirePermission('crm:client:view'), commCtrl.listClientComms);

// ── Reports ───────────────────────────────────────────────────────────────────
router.get('/reports/dashboard',    requirePermission('crm:lead:view'), reportsCtrl.dashboardSummary);
router.get('/reports/pipeline',     requirePermission('crm:lead:view'), reportsCtrl.pipelineValue);
router.get('/reports/funnel',       requirePermission('crm:lead:view'), reportsCtrl.conversionFunnel);
router.get('/reports/sources',      requirePermission('crm:lead:view'), reportsCtrl.sourceQuality);
router.get('/reports/bde',          requirePermission('crm:lead:view'), reportsCtrl.bdePerformance);
router.get('/reports/win-loss',     requirePermission('crm:lead:view'), reportsCtrl.winLossReasons);

// ── CSV Exports ───────────────────────────────────────────────────────────────
router.get('/export/leads',         requirePermission('crm:lead:view'),   reportsCtrl.exportLeads);
router.get('/export/clients',       requirePermission('crm:client:view'),  reportsCtrl.exportClients);

module.exports = router;
