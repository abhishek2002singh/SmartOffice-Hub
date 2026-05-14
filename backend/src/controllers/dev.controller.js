const mongoose = require('mongoose');
const DevProject       = require('../models/DevProject');
const DevMilestone     = require('../models/DevMilestone');
const DevProjectHandover = require('../models/DevProjectHandover');
const DevTask          = require('../models/DevTask');
const DevBug           = require('../models/DevBug');
const DevTaskComment   = require('../models/DevTaskComment');
const DevTimeLog       = require('../models/DevTimeLog');
const Client           = require('../models/Client');
const { logAudit }     = require('../middleware/auditLogger');

// ── helpers ───────────────────────────────────────────────────────────────────

function populateProject(q) {
  return q
    .populate('clientId',       'name companyName')
    .populate('projectManager', 'name email')
    .populate('leadDeveloper',  'name email')
    .populate('teamMembers',    'name email')
    .populate('sourceTicketId', 'title status');
}

// ══════════════════════════════════════════════════════════════════════════════
// PROJECTS
// ══════════════════════════════════════════════════════════════════════════════

exports.listProjects = async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = '-createdAt', status, type, projectManager, leadDeveloper, client, q } = req.query;
    const filter = { deletedAt: null };
    if (status)        filter.status        = status;
    if (type)          filter.type          = type;
    if (projectManager) filter.projectManager = projectManager;
    if (leadDeveloper)  filter.leadDeveloper  = leadDeveloper;
    if (client)         filter.clientId       = client;
    if (q) filter.name = { $regex: q, $options: 'i' };

    const [projects, total] = await Promise.all([
      populateProject(DevProject.find(filter).sort(sort).skip((page - 1) * limit).limit(+limit)),
      DevProject.countDocuments(filter),
    ]);
    res.json({ success: true, data: { projects, total, page: +page, limit: +limit } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.getProject = async (req, res) => {
  try {
    const project = await populateProject(DevProject.findOne({ _id: req.params.id, deletedAt: null }));
    if (!project) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });

    const [milestones, openBugs, taskStats] = await Promise.all([
      DevMilestone.find({ projectId: project._id, deletedAt: null }).sort('sequence').populate('assignedTo', 'name'),
      DevBug.countDocuments({ projectId: project._id, deletedAt: null, status: { $in: ['open', 'in_progress'] } }),
      DevTask.aggregate([
        { $match: { projectId: project._id, deletedAt: null } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const taskCounts = {};
    taskStats.forEach(s => { taskCounts[s._id] = s.count; });

    res.json({ success: true, data: { project, milestones, openBugs, taskCounts } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.createProject = async (req, res) => {
  try {
    const {
      clientId, name, type, ecommercePlatform, description, scope, deliverables,
      priority, startDate, plannedEndDate, projectManager, leadDeveloper, teamMembers,
      techStack, codeRepoUrl, stagingUrl, productionUrl, sourceTicketId,
      amcEnabled, amcDurationMonths, customFields,
    } = req.body;

    if (!clientId || !name || !type) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'clientId, name, type are required' } });
    }

    const clientDoc = await Client.findOne({ _id: clientId, deletedAt: null });
    if (!clientDoc) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Client not found' } });

    const project = await DevProject.create({
      clientId, name, type,
      ecommercePlatform: type === 'ecommerce' ? (ecommercePlatform || null) : null,
      description, scope,
      deliverables: deliverables || [],
      priority: priority || 'medium',
      startDate:      startDate      || null,
      plannedEndDate: plannedEndDate || null,
      projectManager: projectManager || null,
      leadDeveloper:  leadDeveloper  || null,
      teamMembers:    teamMembers    || [],
      techStack:      techStack      || [],
      codeRepoUrl:    codeRepoUrl    || null,
      stagingUrl:     stagingUrl     || null,
      productionUrl:  productionUrl  || null,
      sourceTicketId: sourceTicketId || null,
      amcEnabled:        amcEnabled        || false,
      amcDurationMonths: amcDurationMonths || 12,
      customFields:  customFields  || {},
      createdBy: req.user.userId,
      updatedBy: req.user.userId,
    });

    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'dev_project', resourceId: project._id, after: project.toObject(), req });

    // Notify project manager + lead dev
    [projectManager, leadDeveloper].filter(Boolean).forEach(uid => {
      if (req.io) req.io.to(`user:${uid}`).emit('notification', { type: 'dev:project:assigned', message: `Assigned to project: ${name}`, projectId: project._id });
    });

    res.status(201).json({ success: true, data: { project }, message: 'Project created' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const project = await DevProject.findOne({ _id: req.params.id, deletedAt: null });
    if (!project) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });

    const before = project.toObject();
    const allowed = [
      'name', 'type', 'ecommercePlatform', 'description', 'scope', 'deliverables',
      'status', 'priority', 'startDate', 'plannedEndDate', 'actualEndDate',
      'projectManager', 'leadDeveloper', 'teamMembers', 'techStack',
      'codeRepoUrl', 'stagingUrl', 'productionUrl',
      'amcEnabled', 'amcDurationMonths', 'customFields',
    ];
    allowed.forEach(f => { if (req.body[f] !== undefined) project[f] = req.body[f]; });

    // AMC auto-activation: when project completed, set AMC dates if enabled
    if (req.body.status === 'completed' && project.amcEnabled) {
      const start = new Date();
      project.amcStartDate = start;
      project.amcEndDate   = new Date(start.setMonth(start.getMonth() + (project.amcDurationMonths || 12)));
      project.actualEndDate = project.actualEndDate || new Date();
    }

    project.updatedBy = req.user.userId;
    await project.save();

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'dev_project', resourceId: project._id, before, after: project.toObject(), req });
    res.json({ success: true, data: { project } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const project = await DevProject.findOne({ _id: req.params.id, deletedAt: null });
    if (!project) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });

    const before = project.toObject();
    project.deletedAt = new Date();
    project.updatedBy = req.user.userId;
    await project.save();

    await logAudit({ userId: req.user.userId, action: 'DELETE', resource: 'dev_project', resourceId: project._id, before, req });
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// MILESTONES
// ══════════════════════════════════════════════════════════════════════════════

exports.listMilestones = async (req, res) => {
  try {
    const project = await DevProject.findOne({ _id: req.params.projectId, deletedAt: null });
    if (!project) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });

    const milestones = await DevMilestone.find({ projectId: req.params.projectId, deletedAt: null })
      .sort('sequence')
      .populate('assignedTo', 'name email');
    res.json({ success: true, data: { milestones } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.createMilestone = async (req, res) => {
  try {
    const { title, description, dueDate, deliverables, assignedTo, sequence } = req.body;
    if (!title || !dueDate) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'title and dueDate are required' } });
    }

    const project = await DevProject.findOne({ _id: req.params.projectId, deletedAt: null });
    if (!project) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });

    // Auto-sequence if not provided
    let seq = sequence;
    if (!seq) {
      const last = await DevMilestone.findOne({ projectId: req.params.projectId, deletedAt: null }).sort('-sequence');
      seq = last ? last.sequence + 1 : 1;
    }

    const milestone = await DevMilestone.create({
      projectId: req.params.projectId,
      title, description,
      dueDate: new Date(dueDate),
      deliverables: deliverables || [],
      assignedTo: assignedTo || null,
      sequence: seq,
      createdBy: req.user.userId,
      updatedBy: req.user.userId,
    });

    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'dev_milestone', resourceId: milestone._id, after: milestone.toObject(), req });

    if (assignedTo && req.io) {
      req.io.to(`user:${assignedTo}`).emit('notification', { type: 'dev:milestone:assigned', message: `Milestone assigned: ${title}`, milestoneId: milestone._id });
    }

    res.status(201).json({ success: true, data: { milestone } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.updateMilestone = async (req, res) => {
  try {
    const milestone = await DevMilestone.findOne({ _id: req.params.milestoneId, projectId: req.params.projectId, deletedAt: null });
    if (!milestone) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Milestone not found' } });

    const before = milestone.toObject();
    const allowed = ['title', 'description', 'dueDate', 'status', 'deliverables', 'assignedTo', 'sequence'];
    allowed.forEach(f => { if (req.body[f] !== undefined) milestone[f] = req.body[f]; });
    if (req.body.status === 'completed') milestone.completedDate = milestone.completedDate || new Date();
    milestone.updatedBy = req.user.userId;
    await milestone.save();

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'dev_milestone', resourceId: milestone._id, before, after: milestone.toObject(), req });
    res.json({ success: true, data: { milestone } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.deleteMilestone = async (req, res) => {
  try {
    const milestone = await DevMilestone.findOne({ _id: req.params.milestoneId, projectId: req.params.projectId, deletedAt: null });
    if (!milestone) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Milestone not found' } });

    const before = milestone.toObject();
    milestone.deletedAt = new Date();
    milestone.updatedBy = req.user.userId;
    await milestone.save();

    await logAudit({ userId: req.user.userId, action: 'DELETE', resource: 'dev_milestone', resourceId: milestone._id, before, req });
    res.json({ success: true, message: 'Milestone deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// HANDOVERS
// ══════════════════════════════════════════════════════════════════════════════

exports.listHandovers = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { deletedAt: null };
    if (status) filter.status = status;

    const handovers = await DevProjectHandover.find(filter)
      .sort('-createdAt')
      .populate('clientId',       'name companyName')
      .populate('salesPerson',    'name email')
      .populate('acceptedBy',     'name email')
      .populate('serviceTicketId','title status')
      .populate('projectId',      'name status');

    // Flag overdue (not reviewed within escalateAfterDays)
    const now = Date.now();
    const result = handovers.map(h => {
      const obj = h.toObject();
      if (h.status === 'pending_review') {
        const ageMs  = now - new Date(h.createdAt).getTime();
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        obj.isOverdue = ageDays > h.escalateAfterDays;
        obj.ageDays   = Math.floor(ageDays);
      }
      return obj;
    });

    res.json({ success: true, data: { handovers: result } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.getHandover = async (req, res) => {
  try {
    const handover = await DevProjectHandover.findOne({ _id: req.params.id, deletedAt: null })
      .populate('clientId',       'name companyName mobile email')
      .populate('salesPerson',    'name email')
      .populate('acceptedBy',     'name email')
      .populate('serviceTicketId','title description status')
      .populate('projectId',      'name status');
    if (!handover) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Handover not found' } });
    res.json({ success: true, data: { handover } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.acceptHandover = async (req, res) => {
  try {
    const handover = await DevProjectHandover.findOne({ _id: req.params.id, deletedAt: null });
    if (!handover) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Handover not found' } });
    if (handover.status !== 'pending_review' && handover.status !== 'clarification_needed') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `Cannot accept handover in status: ${handover.status}` } });
    }

    const {
      name, type, ecommercePlatform, description, scope, deliverables,
      priority, startDate, plannedEndDate, projectManager, leadDeveloper, teamMembers,
      techStack, codeRepoUrl, amcEnabled, amcDurationMonths,
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'name and type are required to create project from handover' } });
    }

    // Create the DevProject
    const project = await DevProject.create({
      clientId:       handover.clientId,
      name, type,
      ecommercePlatform: type === 'ecommerce' ? (ecommercePlatform || null) : null,
      description:    description    || handover.originalRequirement,
      scope:          scope          || null,
      deliverables:   deliverables   || [],
      priority:       priority       || 'medium',
      startDate:      startDate      || new Date(),
      plannedEndDate: plannedEndDate || null,
      projectManager: projectManager || null,
      leadDeveloper:  leadDeveloper  || null,
      teamMembers:    teamMembers    || [],
      techStack:      techStack      || [],
      codeRepoUrl:    codeRepoUrl    || null,
      amcEnabled:        amcEnabled        || false,
      amcDurationMonths: amcDurationMonths || 12,
      sourceTicketId: handover.serviceTicketId,
      status:         'active',
      createdBy:      req.user.userId,
      updatedBy:      req.user.userId,
    });

    const before = handover.toObject();
    handover.status     = 'accepted';
    handover.acceptedBy = req.user.userId;
    handover.acceptedAt = new Date();
    handover.projectId  = project._id;
    handover.updatedBy  = req.user.userId;
    await handover.save();

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'dev_handover', resourceId: handover._id, before, after: handover.toObject(), req });
    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'dev_project', resourceId: project._id, after: project.toObject(), req });

    if (handover.salesPerson && req.io) {
      req.io.to(`user:${handover.salesPerson}`).emit('notification', {
        type: 'dev:handover:accepted',
        message: `Your handover for "${name}" has been accepted by Dev team`,
        projectId: project._id,
      });
    }

    res.json({ success: true, data: { handover, project }, message: 'Handover accepted, project created' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.requestClarification = async (req, res) => {
  try {
    const { clarificationNotes } = req.body;
    if (!clarificationNotes?.trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'clarificationNotes required' } });
    }

    const handover = await DevProjectHandover.findOne({ _id: req.params.id, deletedAt: null });
    if (!handover) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Handover not found' } });
    if (handover.status !== 'pending_review') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Can only request clarification on pending_review handovers' } });
    }

    const before = handover.toObject();
    handover.status             = 'clarification_needed';
    handover.clarificationNotes = clarificationNotes.trim();
    handover.updatedBy          = req.user.userId;
    await handover.save();

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'dev_handover', resourceId: handover._id, before, after: handover.toObject(), req });

    if (handover.salesPerson && req.io) {
      req.io.to(`user:${handover.salesPerson}`).emit('notification', {
        type: 'dev:handover:clarification',
        message: `Dev team needs clarification on your handover for client`,
        handoverId: handover._id,
      });
    }

    res.json({ success: true, data: { handover } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// TASKS (Kanban)
// ══════════════════════════════════════════════════════════════════════════════

exports.listTasks = async (req, res) => {
  try {
    const { status, milestoneId, assignedTo, priority, q, page = 1, limit = 100 } = req.query;
    const filter = { projectId: req.params.projectId, deletedAt: null };
    if (status)      filter.status      = status;
    if (milestoneId) filter.milestoneId = milestoneId;
    if (assignedTo)  filter.assignedTo  = assignedTo;
    if (priority)    filter.priority    = priority;
    if (q) filter.title = { $regex: q, $options: 'i' };

    const tasks = await DevTask.find(filter)
      .sort({ status: 1, kanbanOrder: 1, createdAt: 1 })
      .skip((page - 1) * limit).limit(+limit)
      .populate('assignedTo', 'name email')
      .populate('milestoneId', 'title');
    res.json({ success: true, data: { tasks } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.createTask = async (req, res) => {
  try {
    const { title, description, type, priority, assignedTo, milestoneId, dueDate, tags, estimatedHours } = req.body;
    if (!title) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'title is required' } });

    const project = await DevProject.findOne({ _id: req.params.projectId, deletedAt: null });
    if (!project) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });

    const task = await DevTask.create({
      projectId: req.params.projectId,
      title, description,
      type:        type        || 'feature',
      priority:    priority    || 'medium',
      assignedTo:  assignedTo  || null,
      milestoneId: milestoneId || null,
      dueDate:     dueDate     || null,
      tags:        tags        || [],
      estimatedHours: estimatedHours || null,
      reportedBy: req.user.userId,
      createdBy:  req.user.userId,
      updatedBy:  req.user.userId,
    });

    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'dev_task', resourceId: task._id, after: task.toObject(), req });

    if (assignedTo && req.io) {
      req.io.to(`user:${assignedTo}`).emit('notification', { type: 'dev:task:assigned', message: `New task assigned: ${title}`, taskId: task._id });
    }

    res.status(201).json({ success: true, data: { task } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const task = await DevTask.findOne({ _id: req.params.taskId, projectId: req.params.projectId, deletedAt: null });
    if (!task) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });

    const before = task.toObject();
    const allowed = ['title', 'description', 'type', 'status', 'priority', 'assignedTo', 'milestoneId', 'dueDate', 'tags', 'estimatedHours', 'attachments', 'kanbanOrder', 'dependencies'];
    allowed.forEach(f => { if (req.body[f] !== undefined) task[f] = req.body[f]; });
    if (req.body.status === 'done') task.completedDate = task.completedDate || new Date();
    task.updatedBy = req.user.userId;
    await task.save();

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'dev_task', resourceId: task._id, before, after: task.toObject(), req });
    res.json({ success: true, data: { task } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await DevTask.findOne({ _id: req.params.taskId, projectId: req.params.projectId, deletedAt: null });
    if (!task) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });

    const before = task.toObject();
    task.deletedAt = new Date();
    task.updatedBy = req.user.userId;
    await task.save();

    await logAudit({ userId: req.user.userId, action: 'DELETE', resource: 'dev_task', resourceId: task._id, before, req });
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// Bulk status update for Kanban drag-drop
exports.bulkUpdateTasks = async (req, res) => {
  try {
    const { updates } = req.body; // [{ taskId, status, kanbanOrder }]
    if (!Array.isArray(updates) || !updates.length) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'updates array required' } });
    }

    const ops = updates.map(u => ({
      updateOne: {
        filter: { _id: u.taskId, projectId: req.params.projectId, deletedAt: null },
        update: { $set: { status: u.status, kanbanOrder: u.kanbanOrder, updatedBy: req.user.userId } },
      },
    }));
    await DevTask.bulkWrite(ops);

    res.json({ success: true, message: `${updates.length} tasks updated` });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ── Task Comments ─────────────────────────────────────────────────────────────

exports.listTaskComments = async (req, res) => {
  try {
    const comments = await DevTaskComment.find({ taskId: req.params.taskId, deletedAt: null })
      .sort('createdAt')
      .populate('user', 'name email')
      .populate('mentions', 'name');
    res.json({ success: true, data: { comments } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.addTaskComment = async (req, res) => {
  try {
    const { message, mentions } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'message required' } });

    const task = await DevTask.findOne({ _id: req.params.taskId, deletedAt: null });
    if (!task) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });

    const comment = await DevTaskComment.create({
      taskId:   task._id,
      user:     req.user.userId,
      message:  message.trim(),
      mentions: mentions || [],
    });

    const populated = await comment.populate([{ path: 'user', select: 'name email' }, { path: 'mentions', select: 'name' }]);

    if (mentions?.length && req.io) {
      mentions.forEach(uid => {
        req.io.to(`user:${uid}`).emit('notification', { type: 'dev:task:mentioned', message: `You were mentioned in task: ${task.title}`, taskId: task._id });
      });
    }

    res.status(201).json({ success: true, data: { comment: populated } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.deleteTaskComment = async (req, res) => {
  try {
    const comment = await DevTaskComment.findOne({ _id: req.params.commentId, deletedAt: null });
    if (!comment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Comment not found' } });

    const isOwner = comment.user.toString() === req.user.userId.toString();
    const isAdmin = ['SUPERADMIN', 'ADMIN', 'SUBADMIN'].includes(req.user.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot delete another user\'s comment' } });

    comment.deletedAt = new Date();
    await comment.save();
    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ── Time Logs ─────────────────────────────────────────────────────────────────

exports.addTimeLog = async (req, res) => {
  try {
    const { minutes, notes, date } = req.body;
    if (!minutes || minutes < 1) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'minutes must be >= 1' } });

    const task = await DevTask.findOne({ _id: req.params.taskId, deletedAt: null });
    if (!task) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });

    const log = await DevTimeLog.create({
      taskId:    task._id,
      projectId: task.projectId,
      user:      req.user.userId,
      minutes:   +minutes,
      notes:     notes || '',
      date:      date ? new Date(date) : new Date(),
    });

    // Update task actualHours
    const totalMins = await DevTimeLog.aggregate([
      { $match: { taskId: task._id } },
      { $group: { _id: null, total: { $sum: '$minutes' } } },
    ]);
    task.actualHours = Math.round((totalMins[0]?.total || 0) / 60 * 10) / 10;
    await task.save();

    res.status(201).json({ success: true, data: { log } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.listTimeLogs = async (req, res) => {
  try {
    const task = await DevTask.findOne({ _id: req.params.taskId, deletedAt: null });
    if (!task) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });

    const logs = await DevTimeLog.find({ taskId: task._id })
      .sort('-date')
      .populate('user', 'name');

    res.json({ success: true, data: { logs } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// BUGS
// ══════════════════════════════════════════════════════════════════════════════

exports.listBugs = async (req, res) => {
  try {
    const { status, severity, priority, assignedTo, foundIn, q, page = 1, limit = 50 } = req.query;
    const filter = { projectId: req.params.projectId, deletedAt: null };
    if (status)     filter.status     = status;
    if (severity)   filter.severity   = severity;
    if (priority)   filter.priority   = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (foundIn)    filter.foundIn    = foundIn;
    if (q) filter.title = { $regex: q, $options: 'i' };

    const [bugs, total] = await Promise.all([
      DevBug.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(+limit)
        .populate('assignedTo', 'name email')
        .populate('reportedBy', 'name email')
        .populate('taskId', 'title'),
      DevBug.countDocuments(filter),
    ]);
    res.json({ success: true, data: { bugs, total } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.createBug = async (req, res) => {
  try {
    const { title, description, stepsToReproduce, expectedBehavior, actualBehavior, severity, priority, foundIn, assignedTo, taskId, screenshots } = req.body;
    if (!title || !severity) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'title and severity are required' } });
    }

    const project = await DevProject.findOne({ _id: req.params.projectId, deletedAt: null });
    if (!project) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });

    const bug = await DevBug.create({
      projectId: req.params.projectId,
      title, description, stepsToReproduce, expectedBehavior, actualBehavior,
      severity, priority: priority || 'medium',
      foundIn:    foundIn    || 'staging',
      assignedTo: assignedTo || null,
      taskId:     taskId     || null,
      screenshots: screenshots || [],
      reportedBy: req.user.userId,
      createdBy:  req.user.userId,
      updatedBy:  req.user.userId,
    });

    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'dev_bug', resourceId: bug._id, after: bug.toObject(), req });

    if (assignedTo && req.io) {
      req.io.to(`user:${assignedTo}`).emit('notification', { type: 'dev:bug:assigned', message: `Bug assigned to you: ${title} (${severity})`, bugId: bug._id });
    }

    // Alert on blocker/critical
    if (['blocker', 'critical'].includes(severity) && req.io) {
      if (project.projectManager) req.io.to(`user:${project.projectManager}`).emit('notification', { type: 'dev:bug:critical', message: `${severity.toUpperCase()} bug reported: ${title}`, bugId: bug._id });
    }

    res.status(201).json({ success: true, data: { bug } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.updateBug = async (req, res) => {
  try {
    const bug = await DevBug.findOne({ _id: req.params.bugId, projectId: req.params.projectId, deletedAt: null });
    if (!bug) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Bug not found' } });

    const before = bug.toObject();
    const allowed = ['title', 'description', 'stepsToReproduce', 'expectedBehavior', 'actualBehavior', 'severity', 'priority', 'status', 'foundIn', 'assignedTo', 'screenshots', 'taskId'];
    allowed.forEach(f => { if (req.body[f] !== undefined) bug[f] = req.body[f]; });
    if (['fixed', 'closed', 'wont_fix', 'duplicate'].includes(req.body.status)) bug.resolvedAt = bug.resolvedAt || new Date();
    bug.updatedBy = req.user.userId;
    await bug.save();

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'dev_bug', resourceId: bug._id, before, after: bug.toObject(), req });
    res.json({ success: true, data: { bug } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.deleteBug = async (req, res) => {
  try {
    const bug = await DevBug.findOne({ _id: req.params.bugId, projectId: req.params.projectId, deletedAt: null });
    if (!bug) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Bug not found' } });

    const before = bug.toObject();
    bug.deletedAt = new Date();
    bug.updatedBy = req.user.userId;
    await bug.save();

    await logAudit({ userId: req.user.userId, action: 'DELETE', resource: 'dev_bug', resourceId: bug._id, before, req });
    res.json({ success: true, message: 'Bug deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARDS
// ══════════════════════════════════════════════════════════════════════════════

exports.developerDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;
    const today  = new Date(); today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);

    const [myTasksByStatus, overdueTasks, dueSoonTasks, myBugs, weeklyTimeMins] = await Promise.all([
      DevTask.aggregate([
        { $match: { assignedTo: new mongoose.Types.ObjectId(userId), deletedAt: null, status: { $ne: 'done' } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      DevTask.find({ assignedTo: new mongoose.Types.ObjectId(userId), deletedAt: null, status: { $nin: ['done'] }, dueDate: { $lt: today } })
        .populate('projectId', 'name').sort('dueDate').limit(10),
      DevTask.find({ assignedTo: new mongoose.Types.ObjectId(userId), deletedAt: null, status: { $nin: ['done'] }, dueDate: { $gte: today, $lte: weekEnd } })
        .populate('projectId', 'name').sort('dueDate').limit(10),
      DevBug.find({ assignedTo: new mongoose.Types.ObjectId(userId), deletedAt: null, status: { $in: ['open', 'in_progress'] } })
        .populate('projectId', 'name').sort('-createdAt').limit(10),
      DevTimeLog.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId), date: { $gte: new Date(today.getTime() - 7 * 86400000) } } },
        { $group: { _id: null, total: { $sum: '$minutes' } } },
      ]),
    ]);

    const taskCounts = {};
    myTasksByStatus.forEach(s => { taskCounts[s._id] = s.count; });

    res.json({
      success: true,
      data: {
        taskCounts,
        overdueTasks,
        dueSoonTasks,
        myBugs,
        weeklyMinutesLogged: weeklyTimeMins[0]?.total || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.headDashboard = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const [projectStatus, teamWorkload, activeBugsBySeverity, overdueTaskCount, recentProjects] = await Promise.all([
      DevProject.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      DevTask.aggregate([
        { $match: { deletedAt: null, status: { $nin: ['done'] }, assignedTo: { $ne: null } } },
        { $group: { _id: '$assignedTo', taskCount: { $sum: 1 } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: { taskCount: 1, 'user.name': 1, 'user.email': 1 } },
        { $sort: { taskCount: -1 } },
        { $limit: 15 },
      ]),
      DevBug.aggregate([
        { $match: { deletedAt: null, status: { $in: ['open', 'in_progress'] } } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      DevTask.countDocuments({ deletedAt: null, status: { $nin: ['done'] }, dueDate: { $lt: today } }),
      DevProject.find({ deletedAt: null, status: { $in: ['active', 'planning'] } })
        .sort('-updatedAt').limit(8)
        .populate('clientId', 'name companyName')
        .populate('projectManager', 'name')
        .populate('leadDeveloper', 'name'),
    ]);

    const projectCounts = {};
    projectStatus.forEach(s => { projectCounts[s._id] = s.count; });
    const bugCounts = {};
    activeBugsBySeverity.forEach(s => { bugCounts[s._id] = s.count; });

    res.json({
      success: true,
      data: { projectCounts, teamWorkload, bugCounts, overdueTaskCount, recentProjects },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// REPORTS
// ══════════════════════════════════════════════════════════════════════════════

exports.devReports = async (req, res) => {
  try {
    const { projectId, from, to } = req.query;
    const taskMatch = { deletedAt: null };
    const bugMatch  = { deletedAt: null };
    if (projectId) { taskMatch.projectId = new mongoose.Types.ObjectId(projectId); bugMatch.projectId = new mongoose.Types.ObjectId(projectId); }
    if (from || to) {
      const range = {};
      if (from) range.$gte = new Date(from);
      if (to)   range.$lte = new Date(to);
      taskMatch.createdAt = range;
      bugMatch.createdAt  = range;
    }

    const [tasksByStatus, tasksByDev, bugsBySeverity, bugsAging] = await Promise.all([
      DevTask.aggregate([{ $match: taskMatch }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      DevTask.aggregate([
        { $match: taskMatch },
        { $group: { _id: '$assignedTo', total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: { total: 1, done: 1, 'user.name': 1 } },
        { $sort: { done: -1 } },
      ]),
      DevBug.aggregate([{ $match: bugMatch }, { $group: { _id: '$severity', count: { $sum: 1 } } }]),
      DevBug.aggregate([
        { $match: { ...bugMatch, status: { $in: ['open', 'in_progress'] } } },
        { $project: { title: 1, severity: 1, createdAt: 1, ageMs: { $subtract: [new Date(), '$createdAt'] } } },
        { $sort: { ageMs: -1 } },
        { $limit: 20 },
      ]),
    ]);

    res.json({ success: true, data: { tasksByStatus, tasksByDev, bugsBySeverity, bugsAging } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};
