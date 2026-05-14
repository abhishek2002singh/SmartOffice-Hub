const router = require('express').Router();
const auth   = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const ctrl   = require('../controllers/gd.controller');

router.use(auth);

// ── Tasks ─────────────────────────────────────────────────────────────────────
router.get   ('/tasks',          requirePermission('gd:task:view'),   ctrl.listTasks);
router.post  ('/tasks',          requirePermission('gd:task:create'), ctrl.createTask);
router.get   ('/tasks/:id',      requirePermission('gd:task:view'),   ctrl.getTask);
router.patch ('/tasks/:id',      requirePermission('gd:task:create'), ctrl.updateTask);
router.delete('/tasks/:id',      requirePermission('gd:task:create'), ctrl.deleteTask);

// ── Status transitions ────────────────────────────────────────────────────────
router.patch('/tasks/:id/submit',            requirePermission('gd:task:submit'),   ctrl.submitTask);
router.patch('/tasks/:id/request-revision',  requirePermission('gd:task:revision'), ctrl.requestRevision);
router.patch('/tasks/:id/approve',           requirePermission('gd:task:approve'),  ctrl.approveTask);
router.patch('/tasks/:id/deliver',           requirePermission('gd:task:deliver'),  ctrl.deliverTask);

// ── Files ─────────────────────────────────────────────────────────────────────
router.post  ('/tasks/:id/files',              requirePermission('gd:file:upload'), ctrl.uploadMiddleware, ctrl.uploadTaskFile);
router.delete('/tasks/:id/files/:fileId',      requirePermission('gd:file:upload'), ctrl.deleteTaskFile);

// ── Comments ──────────────────────────────────────────────────────────────────
router.get   ('/tasks/:id/comments',               requirePermission('gd:task:view'),   ctrl.listComments);
router.post  ('/tasks/:id/comments',               requirePermission('gd:task:view'),   ctrl.addComment);
router.delete('/tasks/:id/comments/:commentId',    requirePermission('gd:task:view'),   ctrl.deleteComment);

// ── Time logs ─────────────────────────────────────────────────────────────────
router.post('/tasks/:id/time-logs',   requirePermission('gd:task:submit'), ctrl.addTimeLog);

// ── Dashboards ────────────────────────────────────────────────────────────────
router.get('/dashboard/designer',  requirePermission('gd:task:view'),   ctrl.designerDashboard);
router.get('/dashboard/head',      requirePermission('gd:report:view'), ctrl.headDashboard);
router.get('/reports',             requirePermission('gd:report:view'), ctrl.gdReport);

module.exports = router;
