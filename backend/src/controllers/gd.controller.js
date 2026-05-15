const mongoose = require('mongoose');
const multer   = require('multer');
const GDTask         = require('../models/GDTask');
const GDTaskFile     = require('../models/GDTaskFile');
const GDTaskRevision = require('../models/GDTaskRevision');
const GDTaskComment  = require('../models/GDTaskComment');
const GDTimeLog      = require('../models/GDTimeLog');
const Client         = require('../models/Client');
const { logAudit }   = require('../middleware/auditLogger');
const { getTaskFolder, uploadFile, deleteFile } = require('../services/googleDrive.service');

const BLOCKED_EXTENSIONS = /\.(exe|bat|cmd|sh|ps1|vbs|js|jar|msi|com|scr|pif|reg|dll|so|dylib)$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (BLOCKED_EXTENSIONS.test(file.originalname)) {
      return cb(new Error('File type not allowed'));
    }
    cb(null, true);
  },
});
exports.uploadMiddleware = upload.single('file');

// â”€â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function buildFilter(query) {
  const filter = { deletedAt: null };
  if (query.status)   filter.status   = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.type)     filter.type     = query.type;
  if (query.client)   filter.client   = query.client;
  if (query.assignedTo) filter.assignedTo = query.assignedTo;
  if (query.sourceModule) filter.sourceModule = query.sourceModule;
  if (query.q) filter.title = { $regex: query.q, $options: 'i' };
  return filter;
}

async function populateTask(query) {
  return query
    .populate('client',     'companyName')
    .populate('assignedBy', 'name email')
    .populate('assignedTo', 'name email')
    .populate('createdBy',  'name email');
}

// â”€â”€â”€ Task CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

exports.listTasks = async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = '-createdAt', ...rest } = req.query;
    const filter = buildFilter(rest);

    // Non-admin designers see only their own tasks
    const role = req.user.role;
    if (!['SUPERADMIN', 'ADMIN', 'SUBADMIN', 'DEPT_HEAD'].includes(role)) {
      filter.assignedTo = req.user.userId;
    }

    const [tasks, total] = await Promise.all([
      populateTask(GDTask.find(filter).sort(sort).skip((page - 1) * limit).limit(+limit)),
      GDTask.countDocuments(filter),
    ]);

    res.json({ success: true, data: { tasks, total, page: +page, limit: +limit } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.getTask = async (req, res) => {
  try {
    const task = await populateTask(GDTask.findOne({ _id: req.params.id, deletedAt: null }));
    if (!task) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });

    const [files, revisions, comments, timeLogs] = await Promise.all([
      GDTaskFile.find({ task: task._id, deletedAt: null }).sort('-createdAt')
        .populate('uploadedBy', 'name'),
      GDTaskRevision.find({ task: task._id }).sort('version')
        .populate('requestedBy', 'name'),
      GDTaskComment.find({ task: task._id, deletedAt: null }).sort('createdAt')
        .populate('user', 'name email').populate('mentions', 'name'),
      GDTimeLog.find({ task: task._id }).sort('-loggedAt').populate('user', 'name'),
    ]);

    res.json({ success: true, data: { task, files, revisions, comments, timeLogs } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.createTask = async (req, res) => {
  try {
    const { title, brief, type, priority, client, assignedTo, referenceLinks, dueDate, sourceModule, sourceTaskId } = req.body;
    if (!title || !type || !client) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'title, type, client are required' } });
    }

    const clientDoc = await Client.findOne({ _id: client, deletedAt: null }).select('companyName');
    if (!clientDoc) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Client not found' } });

    const task = await GDTask.create({
      title, brief, type, priority, client, assignedTo: assignedTo || null,
      referenceLinks: referenceLinks || [],
      dueDate: dueDate || null,
      sourceModule: sourceModule || 'direct',
      sourceTaskId: sourceTaskId || null,
      assignedBy: req.user.userId,
      createdBy:  req.user.userId,
      updatedBy:  req.user.userId,
    });

    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'gd_task', resourceId: task._id, after: task.toObject(), req });

    if (assignedTo && req.io) {
      req.io.to(`user:${assignedTo}`).emit('notification', {
        type: 'gd:task:assigned',
        message: `New GD task assigned: ${title}`,
        taskId: task._id,
      });
    }

    res.status(201).json({ success: true, data: task, message: 'Task created' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const task = await GDTask.findOne({ _id: req.params.id, deletedAt: null });
    if (!task) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });

    const before = task.toObject();
    const allowed = ['title', 'brief', 'type', 'priority', 'assignedTo', 'referenceLinks', 'dueDate'];
    allowed.forEach(f => { if (req.body[f] !== undefined) task[f] = req.body[f]; });
    task.updatedBy = req.user.userId;
    await task.save();

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'gd_task', resourceId: task._id, before, after: task.toObject(), req });

    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await GDTask.findOne({ _id: req.params.id, deletedAt: null });
    if (!task) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });

    const before = task.toObject();
    task.deletedAt = new Date();
    task.updatedBy = req.user.userId;
    await task.save();

    await logAudit({ userId: req.user.userId, action: 'DELETE', resource: 'gd_task', resourceId: task._id, before, req });

    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// â”€â”€â”€ Status transitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

exports.submitTask = async (req, res) => {
  try {
    const task = await GDTask.findOne({ _id: req.params.id, deletedAt: null });
    if (!task) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });
    if (!['new', 'in_progress', 'revision_requested'].includes(task.status)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `Cannot submit from status: ${task.status}` } });
    }

    const before = task.toObject();
    task.status      = 'submitted';
    task.submittedAt = new Date();
    task.updatedBy   = req.user.userId;
    await task.save();

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'gd_task', resourceId: task._id, before, after: task.toObject(), req });

    if (task.assignedBy && req.io) {
      req.io.to(`user:${task.assignedBy}`).emit('notification', {
        type: 'gd:task:submitted',
        message: `GD work submitted for review: ${task.title}`,
        taskId: task._id,
      });
    }

    res.json({ success: true, data: task, message: 'Task submitted for review' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.requestRevision = async (req, res) => {
  try {
    const { revisionNotes } = req.body;
    if (!revisionNotes?.trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'revisionNotes required' } });
    }

    const task = await GDTask.findOne({ _id: req.params.id, deletedAt: null });
    if (!task) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });
    if (task.status !== 'submitted') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Task must be submitted to request revision' } });
    }

    const before = task.toObject();
    task.status        = 'revision_requested';
    task.revisionCount = (task.revisionCount || 0) + 1;
    task.updatedBy     = req.user.userId;
    await task.save();

    const revision = await GDTaskRevision.create({
      task:          task._id,
      version:       task.revisionCount,
      requestedBy:   req.user.userId,
      revisionNotes: revisionNotes.trim(),
    });

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'gd_task', resourceId: task._id, before, after: task.toObject(), req });

    if (task.assignedTo && req.io) {
      req.io.to(`user:${task.assignedTo}`).emit('notification', {
        type: 'gd:task:revision_requested',
        message: `Revision requested on: ${task.title}`,
        taskId: task._id,
      });
    }

    res.json({ success: true, data: { task, revision }, message: 'Revision requested' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.approveTask = async (req, res) => {
  try {
    const task = await GDTask.findOne({ _id: req.params.id, deletedAt: null });
    if (!task) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });
    if (task.status !== 'submitted') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Task must be submitted to approve' } });
    }

    const before    = task.toObject();
    task.status     = 'approved';
    task.approvedAt = new Date();
    task.updatedBy  = req.user.userId;
    await task.save();

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'gd_task', resourceId: task._id, before, after: task.toObject(), req });

    if (task.assignedBy && req.io) {
      req.io.to(`user:${task.assignedBy}`).emit('notification', {
        type: 'gd:task:approved',
        message: `GD task approved: ${task.title}. Ready to deliver to client.`,
        taskId: task._id,
      });
    }
    if (task.assignedTo && req.io) {
      req.io.to(`user:${task.assignedTo}`).emit('notification', {
        type: 'gd:task:approved',
        message: `Your work on "${task.title}" has been approved!`,
        taskId: task._id,
      });
    }

    res.json({ success: true, data: task, message: 'Task approved' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.deliverTask = async (req, res) => {
  try {
    const { deliveryMethod, deliveryNotes } = req.body;
    if (!deliveryMethod) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'deliveryMethod required (whatsapp/email/call/other)' } });
    }

    const task = await GDTask.findOne({ _id: req.params.id, deletedAt: null });
    if (!task) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });
    if (task.status !== 'approved') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Task must be approved before delivering to client' } });
    }

    const before           = task.toObject();
    task.status            = 'delivered_to_client';
    task.deliveredAt       = new Date();
    task.completedDate     = new Date();
    task.deliveryMethod    = deliveryMethod;
    task.deliveryNotes     = deliveryNotes || '';
    task.updatedBy         = req.user.userId;
    await task.save();

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'gd_task', resourceId: task._id, before, after: task.toObject(), req });

    res.json({ success: true, data: task, message: 'Task marked as delivered to client' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// â”€â”€â”€ File upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

exports.uploadTaskFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No file uploaded' } });

    const task = await GDTask.findOne({ _id: req.params.id, deletedAt: null }).populate('client', 'companyName');
    if (!task) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });

    // Ensure/get Drive folder
    let folderId = task.gdriveFolderId;
    if (!folderId) {
      folderId = await getTaskFolder(task.client.companyName, task._id.toString());
      task.gdriveFolderId = folderId;
      await task.save();
    }

    // Determine next version for this fileType
    const lastFile = await GDTaskFile.findOne({ task: task._id, fileType: req.body.fileType || 'draft', deletedAt: null }).sort('-version');
    const version  = lastFile ? lastFile.version + 1 : 1;

    // Upload to Drive
    const driveResult = await uploadFile({
      buffer:   req.file.buffer,
      mimeType: req.file.mimetype,
      fileName: req.file.originalname,
      folderId,
    });

    const fileDoc = await GDTaskFile.create({
      task:          task._id,
      fileType:      req.body.fileType || 'draft',
      fileName:      req.file.originalname,
      mimeType:      req.file.mimetype,
      fileSize:      req.file.size,
      version,
      gdriveFileId:  driveResult.fileId,
      gdriveLink:    driveResult.webViewLink,
      thumbnailLink: driveResult.thumbnailLink || null,
      uploadedBy:    req.user.userId,
    });

    // Auto-set task to in_progress on first upload if still new
    if (task.status === 'new') {
      task.status    = 'in_progress';
      task.updatedBy = req.user.userId;
      await task.save();
    }

    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'gd_task_file', resourceId: fileDoc._id, after: fileDoc.toObject(), req });

    res.status(201).json({ success: true, data: fileDoc, message: 'File uploaded' });
  } catch (err) {
    console.error('GD upload error:', err);
    res.status(500).json({ success: false, error: { code: 'UPLOAD_ERROR', message: err.message } });
  }
};

exports.deleteTaskFile = async (req, res) => {
  try {
    const file = await GDTaskFile.findOne({ _id: req.params.fileId, deletedAt: null });
    if (!file) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'File not found' } });

    file.deletedAt = new Date();
    await file.save();

    // Best-effort Drive delete
    if (file.gdriveFileId) {
      try { await deleteFile(file.gdriveFileId); } catch (_) {}
    }

    await logAudit({ userId: req.user.userId, action: 'DELETE', resource: 'gd_task_file', resourceId: file._id, req });

    res.json({ success: true, message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// â”€â”€â”€ Comments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

exports.listComments = async (req, res) => {
  try {
    const comments = await GDTaskComment.find({ task: req.params.id, deletedAt: null })
      .sort('createdAt')
      .populate('user', 'name email')
      .populate('mentions', 'name');
    res.json({ success: true, data: comments });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { message, mentions } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'message required' } });

    const task = await GDTask.findOne({ _id: req.params.id, deletedAt: null });
    if (!task) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });

    const comment = await GDTaskComment.create({
      task:     task._id,
      user:     req.user.userId,
      message:  message.trim(),
      mentions: mentions || [],
    });

    const populated = await comment.populate([
      { path: 'user', select: 'name email' },
      { path: 'mentions', select: 'name' },
    ]);

    // Notify mentioned users
    if (mentions?.length && req.io) {
      mentions.forEach(uid => {
        req.io.to(`user:${uid}`).emit('notification', {
          type: 'gd:task:mentioned',
          message: `${req.user.name} mentioned you in a comment on "${task.title}"`,
          taskId: task._id,
        });
      });
    }

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const comment = await GDTaskComment.findOne({ _id: req.params.commentId, deletedAt: null });
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

// â”€â”€â”€ Time logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

exports.addTimeLog = async (req, res) => {
  try {
    const { minutes, notes } = req.body;
    if (!minutes || minutes < 1) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'minutes must be >= 1' } });

    const task = await GDTask.findOne({ _id: req.params.id, deletedAt: null });
    if (!task) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });

    const log = await GDTimeLog.create({ task: task._id, user: req.user.userId, minutes: +minutes, notes: notes || '' });
    res.status(201).json({ success: true, data: log });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// â”€â”€â”€ Dashboards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

exports.designerDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;
    const today  = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

    const [statusCounts, dueTodayTasks, recentTasks] = await Promise.all([
      GDTask.aggregate([
        { $match: { assignedTo: userId, deletedAt: null } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      GDTask.find({ assignedTo: userId, deletedAt: null, dueDate: { $gte: today, $lt: tomorrow }, status: { $nin: ['delivered_to_client'] } })
        .populate('client', 'companyName').sort('dueDate').limit(10),
      GDTask.find({ assignedTo: userId, deletedAt: null, status: { $nin: ['delivered_to_client'] } })
        .populate('client', 'companyName').sort('-updatedAt').limit(20),
    ]);

    // Total time logged by designer
    const timeAgg = await GDTimeLog.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, totalMinutes: { $sum: '$minutes' } } },
    ]);

    const counts = {};
    statusCounts.forEach(s => { counts[s._id] = s.count; });

    res.json({
      success: true,
      data: {
        statusCounts: counts,
        dueTodayTasks,
        recentTasks,
        totalMinutesLogged: timeAgg[0]?.totalMinutes || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.headDashboard = async (req, res) => {
  try {
    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

    const [statusCounts, overdueTasks, designerLoad, recentActivity] = await Promise.all([
      GDTask.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      GDTask.find({
        deletedAt: null,
        status: { $nin: ['delivered_to_client', 'approved'] },
        dueDate: { $lt: today },
      }).populate('client', 'companyName').populate('assignedTo', 'name').sort('dueDate').limit(20),
      GDTask.aggregate([
        { $match: { deletedAt: null, status: { $nin: ['delivered_to_client'] } } },
        { $group: { _id: '$assignedTo', active: { $sum: 1 }, avgRevisions: { $avg: '$revisionCount' } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: { active: 1, avgRevisions: 1, 'user.name': 1, 'user.email': 1 } },
        { $sort: { active: -1 } },
      ]),
      GDTask.find({ deletedAt: null })
        .populate('client', 'companyName').populate('assignedTo', 'name').sort('-updatedAt').limit(10),
    ]);

    // Turnaround & on-time stats
    const deliveredTasks = await GDTask.find({ deletedAt: null, status: 'delivered_to_client', deliveredAt: { $ne: null } })
      .select('assignedDate dueDate deliveredAt revisionCount');

    let onTime = 0, late = 0, totalRevisions = 0;
    deliveredTasks.forEach(t => {
      if (t.dueDate && t.deliveredAt <= t.dueDate) onTime++; else late++;
      totalRevisions += t.revisionCount || 0;
    });

    const counts = {};
    statusCounts.forEach(s => { counts[s._id] = s.count; });

    res.json({
      success: true,
      data: {
        statusCounts: counts,
        overdueTasks,
        designerLoad,
        recentActivity,
        stats: {
          delivered: deliveredTasks.length,
          onTime,
          late,
          onTimePct: deliveredTasks.length ? Math.round((onTime / deliveredTasks.length) * 100) : 0,
          avgRevisions: deliveredTasks.length ? (totalRevisions / deliveredTasks.length).toFixed(1) : 0,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.gdReport = async (req, res) => {
  try {
    const { from, to, designer } = req.query;
    const match = { deletedAt: null };
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to)   match.createdAt.$lte = new Date(to);
    }
    if (designer) match.assignedTo = new mongoose.Types.ObjectId(designer);

    const [byType, byStatus, byDesigner, byClient] = await Promise.all([
      GDTask.aggregate([{ $match: match }, { $group: { _id: '$type', count: { $sum: 1 } } }]),
      GDTask.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      GDTask.aggregate([
        { $match: match },
        { $group: { _id: '$assignedTo', total: { $sum: 1 }, avgRevisions: { $avg: '$revisionCount' } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: { total: 1, avgRevisions: 1, 'user.name': 1 } },
        { $sort: { total: -1 } },
      ]),
      GDTask.aggregate([
        { $match: match },
        { $group: { _id: '$client', total: { $sum: 1 } } },
        { $lookup: { from: 'clients', localField: '_id', foreignField: '_id', as: 'client' } },
        { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
        { $project: { total: 1, 'client.companyName': 1 } },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ]),
    ]);

    res.json({ success: true, data: { byType, byStatus, byDesigner, byClient } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};
