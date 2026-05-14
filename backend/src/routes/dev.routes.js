const express = require('express');
const router  = express.Router();
const auth                  = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const ctrl = require('../controllers/dev.controller');

router.use(auth);

// ── Projects ──────────────────────────────────────────────────────────────────
router.get   ('/projects',     requirePermission('dev:project:read'),   ctrl.listProjects);
router.post  ('/projects',     requirePermission('dev:project:create'), ctrl.createProject);
router.get   ('/projects/:id', requirePermission('dev:project:read'),   ctrl.getProject);
router.patch ('/projects/:id', requirePermission('dev:project:update'), ctrl.updateProject);
router.delete('/projects/:id', requirePermission('dev:project:delete'), ctrl.deleteProject);

// ── Milestones ────────────────────────────────────────────────────────────────
router.get   ('/projects/:projectId/milestones',                requirePermission('dev:milestone:read'),   ctrl.listMilestones);
router.post  ('/projects/:projectId/milestones',                requirePermission('dev:milestone:create'), ctrl.createMilestone);
router.patch ('/projects/:projectId/milestones/:milestoneId',   requirePermission('dev:milestone:update'), ctrl.updateMilestone);
router.delete('/projects/:projectId/milestones/:milestoneId',   requirePermission('dev:milestone:delete'), ctrl.deleteMilestone);

// ── Tasks (Kanban) ────────────────────────────────────────────────────────────
router.get   ('/projects/:projectId/tasks',             requirePermission('dev:task:read'),   ctrl.listTasks);
router.post  ('/projects/:projectId/tasks',             requirePermission('dev:task:create'), ctrl.createTask);
router.patch ('/projects/:projectId/tasks/bulk',        requirePermission('dev:task:update'), ctrl.bulkUpdateTasks);
router.patch ('/projects/:projectId/tasks/:taskId',     requirePermission('dev:task:update'), ctrl.updateTask);
router.delete('/projects/:projectId/tasks/:taskId',     requirePermission('dev:task:delete'), ctrl.deleteTask);

// ── Task Comments ─────────────────────────────────────────────────────────────
router.get   ('/projects/:projectId/tasks/:taskId/comments',              requirePermission('dev:task:read'),   ctrl.listTaskComments);
router.post  ('/projects/:projectId/tasks/:taskId/comments',              requirePermission('dev:task:create'), ctrl.addTaskComment);
router.delete('/projects/:projectId/tasks/:taskId/comments/:commentId',   requirePermission('dev:task:update'), ctrl.deleteTaskComment);

// ── Time Logs ─────────────────────────────────────────────────────────────────
router.get ('/projects/:projectId/tasks/:taskId/time-logs', requirePermission('dev:task:read'),       ctrl.listTimeLogs);
router.post('/projects/:projectId/tasks/:taskId/time-logs', requirePermission('dev:time_log:create'), ctrl.addTimeLog);

// ── Bugs ──────────────────────────────────────────────────────────────────────
router.get   ('/projects/:projectId/bugs',          requirePermission('dev:bug:read'),   ctrl.listBugs);
router.post  ('/projects/:projectId/bugs',          requirePermission('dev:bug:create'), ctrl.createBug);
router.patch ('/projects/:projectId/bugs/:bugId',   requirePermission('dev:bug:update'), ctrl.updateBug);
router.delete('/projects/:projectId/bugs/:bugId',   requirePermission('dev:bug:delete'), ctrl.deleteBug);

// ── Handovers ─────────────────────────────────────────────────────────────────
router.get  ('/handovers',              requirePermission('dev:handover:read'),   ctrl.listHandovers);
router.get  ('/handovers/:id',          requirePermission('dev:handover:read'),   ctrl.getHandover);
router.patch('/handovers/:id/accept',   requirePermission('dev:handover:accept'), ctrl.acceptHandover);
router.patch('/handovers/:id/clarify',  requirePermission('dev:handover:accept'), ctrl.requestClarification);

// ── Dashboards ────────────────────────────────────────────────────────────────
router.get('/dashboard/developer', requirePermission('dev:project:read'), ctrl.developerDashboard);
router.get('/dashboard/head',      requirePermission('dev:project:read'), ctrl.headDashboard);
router.get('/reports',             requirePermission('dev:report:read'),  ctrl.devReports);

module.exports = router;
