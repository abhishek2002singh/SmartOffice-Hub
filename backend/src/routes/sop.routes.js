const express = require('express');
const router  = express.Router();
const auth                  = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const ctrl = require('../controllers/sop.controller');

router.use(auth);

// ─── Categories ───────────────────────────────────────────────────────────────
router.post  ('/categories/seed',  requirePermission('sops:category:manage'), ctrl.seedDefaultCategories);
router.get   ('/categories',                                                   ctrl.listCategories);
router.post  ('/categories',       requirePermission('sops:category:manage'), ctrl.createCategory);
router.patch ('/categories/:id',   requirePermission('sops:category:manage'), ctrl.updateCategory);
router.delete('/categories/:id',   requirePermission('sops:category:manage'), ctrl.deleteCategory);

// ─── My SOPs ─────────────────────────────────────────────────────────────────
router.get('/me/pending',         ctrl.getMyPendingSOPs);
router.get('/me/acknowledgements',ctrl.getMyAcknowledgements);

// ─── Approval Inbox ───────────────────────────────────────────────────────────
router.get('/approvals',          requirePermission('sops:approve'), ctrl.getApprovalInbox);

// ─── SOP CRUD ─────────────────────────────────────────────────────────────────
router.get   ('/',    ctrl.listSOPs);
router.post  ('/',    requirePermission('sops:create'), ctrl.createSOP);
router.get   ('/:id', ctrl.getSOPById);
router.patch ('/:id', requirePermission('sops:create'), ctrl.updateSOP);
router.delete('/:id', requirePermission('sops:delete'), ctrl.deleteSOP);

// ─── Version History ──────────────────────────────────────────────────────────
router.get('/:id/versions', ctrl.getVersionHistory);

// ─── Approval Workflow ────────────────────────────────────────────────────────
router.post ('/:id/submit-for-approval', requirePermission('sops:create'), ctrl.submitForApproval);
router.patch('/:id/review',              requirePermission('sops:approve'), ctrl.reviewApproval);
router.patch('/:id/publish',             requirePermission('sops:publish'), ctrl.publishSOP);
router.patch('/:id/archive',             requirePermission('sops:publish'), ctrl.archiveSOP);

// ─── Acknowledgement ──────────────────────────────────────────────────────────
router.post('/:id/acknowledge',              ctrl.acknowledgeSOP);
router.get ('/:id/acknowledgement-report',   requirePermission('sops:approve'), ctrl.getAcknowledgementReport);

module.exports = router;
