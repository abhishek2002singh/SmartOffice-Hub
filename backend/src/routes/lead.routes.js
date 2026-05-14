const router = require('express').Router();
const ctrl   = require('../controllers/lead.controller');
const authenticate = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');

router.use(authenticate);

// Lead sources (needed for create form)
router.get('/sources', ctrl.listSources);

// CSV template download
router.get('/import/template', ctrl.downloadTemplate);

// Stats
router.get('/stats', requirePermission('crm:lead:view'), ctrl.getStats);

// Bulk import
router.post('/import', requirePermission('crm:lead:create'), ctrl.bulkImport);

// CRUD
router.get('/',    requirePermission('crm:lead:view'),   ctrl.listLeads);
router.post('/',   requirePermission('crm:lead:create'), ctrl.createLead);
router.get('/:id', requirePermission('crm:lead:view'),   ctrl.getLead);
router.patch('/:id', requirePermission('crm:lead:edit'), ctrl.updateLead);
router.delete('/:id', requirePermission('crm:lead:delete'), ctrl.deleteLead);

// Assign
router.patch('/:id/assign',      requirePermission('crm:lead:assign'), ctrl.assignLead);
router.patch('/:id/auto-assign', requirePermission('crm:lead:assign'), ctrl.autoAssignLead);

// Stage change
router.patch('/:id/stage', requirePermission('crm:lead:edit'), ctrl.changeStage);

// Activities
router.get('/:id/activities',  requirePermission('crm:lead:view'),   ctrl.getActivities);
router.post('/:id/activities', requirePermission('crm:lead:edit'),   ctrl.addActivity);

module.exports = router;
