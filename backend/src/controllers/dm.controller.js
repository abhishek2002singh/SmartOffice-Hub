const mongoose  = require('mongoose');
const DMPlatform       = require('../models/DMPlatform');
const DMDailyTask      = require('../models/DMDailyTask');
const DMCustomField    = require('../models/DMCustomField');
const DMClientPlatform = require('../models/DMClientPlatform');
const DMDailyLog       = require('../models/DMDailyLog');
const GDTask           = require('../models/GDTask');
const { logAudit }     = require('../middleware/auditLogger');
const dayjs            = require('dayjs');

// ─── Platforms ────────────────────────────────────────────────────────────────

exports.listPlatforms = async (req, res, next) => {
  try {
    const platforms = await DMPlatform.find({ deletedAt: null })
      .sort({ sortOrder: 1, name: 1 });
    res.json({ success: true, data: { platforms } });
  } catch (err) { next(err); }
};

exports.createPlatform = async (req, res, next) => {
  try {
    const { name, code, description, sortOrder } = req.body;
    const platform = await DMPlatform.create({
      name, code: code.toUpperCase(), description, sortOrder: sortOrder || 0,
      createdBy: req.user.userId,
    });
    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'dm_platform', resourceId: platform._id, before: null, after: platform.toObject(), req });
    res.status(201).json({ success: true, data: { platform } });
  } catch (err) { next(err); }
};

exports.updatePlatform = async (req, res, next) => {
  try {
    const { id } = req.params;
    const before = await DMPlatform.findById(id).lean();
    const platform = await DMPlatform.findByIdAndUpdate(
      id,
      { ...req.body, updatedBy: req.user.userId },
      { new: true, runValidators: true }
    );
    if (!platform) return res.status(404).json({ success: false, error: { message: 'Platform not found' } });
    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'dm_platform', resourceId: platform._id, before, after: platform.toObject(), req });
    res.json({ success: true, data: { platform } });
  } catch (err) { next(err); }
};

exports.deletePlatform = async (req, res, next) => {
  try {
    const platform = await DMPlatform.findByIdAndUpdate(
      req.params.id,
      { deletedAt: new Date(), updatedBy: req.user.userId },
      { new: true }
    );
    if (!platform) return res.status(404).json({ success: false, error: { message: 'Platform not found' } });
    await logAudit({ userId: req.user.userId, action: 'DELETE', resource: 'dm_platform', resourceId: platform._id, before: platform.toObject(), after: null, req });
    res.json({ success: true, message: 'Platform removed' });
  } catch (err) { next(err); }
};

// ─── Daily Tasks ──────────────────────────────────────────────────────────────

exports.listTasks = async (req, res, next) => {
  try {
    const tasks = await DMDailyTask.find({ platform: req.params.platformId, deletedAt: null })
      .sort({ sortOrder: 1, title: 1 });
    res.json({ success: true, data: { tasks } });
  } catch (err) { next(err); }
};

exports.createTask = async (req, res, next) => {
  try {
    const { platformId } = req.params;
    const { title, description, hasCount, sortOrder } = req.body;
    const task = await DMDailyTask.create({
      platform: platformId, title, description, hasCount: !!hasCount,
      sortOrder: sortOrder || 0, createdBy: req.user.userId,
    });
    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'dm_task', resourceId: task._id, before: null, after: task.toObject(), req });
    res.status(201).json({ success: true, data: { task } });
  } catch (err) { next(err); }
};

exports.updateTask = async (req, res, next) => {
  try {
    const before = await DMDailyTask.findById(req.params.taskId).lean();
    const task = await DMDailyTask.findByIdAndUpdate(
      req.params.taskId,
      { ...req.body, updatedBy: req.user.userId },
      { new: true, runValidators: true }
    );
    if (!task) return res.status(404).json({ success: false, error: { message: 'Task not found' } });
    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'dm_task', resourceId: task._id, before, after: task.toObject(), req });
    res.json({ success: true, data: { task } });
  } catch (err) { next(err); }
};

exports.deleteTask = async (req, res, next) => {
  try {
    const task = await DMDailyTask.findByIdAndUpdate(
      req.params.taskId,
      { deletedAt: new Date(), updatedBy: req.user.userId },
      { new: true }
    );
    if (!task) return res.status(404).json({ success: false, error: { message: 'Task not found' } });
    await logAudit({ userId: req.user.userId, action: 'DELETE', resource: 'dm_task', resourceId: task._id, before: task.toObject(), after: null, req });
    res.json({ success: true, message: 'Task removed' });
  } catch (err) { next(err); }
};

exports.reorderTasks = async (req, res, next) => {
  try {
    // req.body.order = [{ id, sortOrder }, ...]
    const ops = (req.body.order || []).map(({ id, sortOrder }) =>
      DMDailyTask.findByIdAndUpdate(id, { sortOrder, updatedBy: req.user.userId })
    );
    await Promise.all(ops);
    res.json({ success: true, message: 'Tasks reordered' });
  } catch (err) { next(err); }
};

// ─── Custom Fields ────────────────────────────────────────────────────────────

exports.listCustomFields = async (req, res, next) => {
  try {
    const { platformId } = req.params;
    const { clientId } = req.query;
    const filter = { platform: platformId, deletedAt: null };
    if (clientId) filter.$or = [{ client: clientId }, { client: null }];
    const fields = await DMCustomField.find(filter).sort({ sortOrder: 1 });
    res.json({ success: true, data: { fields } });
  } catch (err) { next(err); }
};

exports.createCustomField = async (req, res, next) => {
  try {
    const { platformId } = req.params;
    const { label, fieldType, options, isRequired, sortOrder, clientId } = req.body;
    const field = await DMCustomField.create({
      platform: platformId, client: clientId || null,
      label, fieldType, options: options || [],
      isRequired: !!isRequired, sortOrder: sortOrder || 0,
      createdBy: req.user.userId,
    });
    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'dm_custom_field', resourceId: field._id, before: null, after: field.toObject(), req });
    res.status(201).json({ success: true, data: { field } });
  } catch (err) { next(err); }
};

exports.updateCustomField = async (req, res, next) => {
  try {
    const before = await DMCustomField.findById(req.params.fieldId).lean();
    const field = await DMCustomField.findByIdAndUpdate(
      req.params.fieldId,
      { ...req.body, updatedBy: req.user.userId },
      { new: true }
    );
    if (!field) return res.status(404).json({ success: false, error: { message: 'Field not found' } });
    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'dm_custom_field', resourceId: field._id, before, after: field.toObject(), req });
    res.json({ success: true, data: { field } });
  } catch (err) { next(err); }
};

exports.deleteCustomField = async (req, res, next) => {
  try {
    const field = await DMCustomField.findByIdAndUpdate(
      req.params.fieldId,
      { deletedAt: new Date(), updatedBy: req.user.userId },
      { new: true }
    );
    if (!field) return res.status(404).json({ success: false, error: { message: 'Field not found' } });
    await logAudit({ userId: req.user.userId, action: 'DELETE', resource: 'dm_custom_field', resourceId: field._id, before: field.toObject(), after: null, req });
    res.json({ success: true, message: 'Custom field removed' });
  } catch (err) { next(err); }
};

// ─── Client Platform Mapping ─────────────────────────────────────────────────

exports.getClientPlatforms = async (req, res, next) => {
  try {
    const mappings = await DMClientPlatform.find({ client: req.params.clientId, deletedAt: null })
      .populate('platform', 'name code sortOrder')
      .populate('assignedTo', 'name email')
      .sort({ 'platform.sortOrder': 1 });
    res.json({ success: true, data: { mappings } });
  } catch (err) { next(err); }
};

exports.addClientPlatform = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const { platformId, assignedTo, startDate, notes } = req.body;

    const existing = await DMClientPlatform.findOne({ client: clientId, platform: platformId, deletedAt: null });
    if (existing) return res.status(409).json({ success: false, error: { message: 'Platform already added for this client' } });

    const mapping = await DMClientPlatform.create({
      client: clientId, platform: platformId,
      assignedTo: assignedTo || [], startDate: startDate || new Date(), notes,
      createdBy: req.user.userId,
    });
    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'dm_client_platform', resourceId: mapping._id, before: null, after: mapping.toObject(), req });
    const populated = await mapping.populate('platform', 'name code sortOrder');
    res.status(201).json({ success: true, data: { mapping: populated } });
  } catch (err) { next(err); }
};

exports.updateClientPlatform = async (req, res, next) => {
  try {
    const before = await DMClientPlatform.findById(req.params.mappingId).lean();
    const mapping = await DMClientPlatform.findByIdAndUpdate(
      req.params.mappingId,
      { ...req.body, updatedBy: req.user.userId },
      { new: true }
    ).populate('platform', 'name code');
    if (!mapping) return res.status(404).json({ success: false, error: { message: 'Mapping not found' } });
    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'dm_client_platform', resourceId: mapping._id, before, after: mapping.toObject(), req });
    res.json({ success: true, data: { mapping } });
  } catch (err) { next(err); }
};

exports.removeClientPlatform = async (req, res, next) => {
  try {
    const mapping = await DMClientPlatform.findByIdAndUpdate(
      req.params.mappingId,
      { deletedAt: new Date(), isActive: false, updatedBy: req.user.userId },
      { new: true }
    );
    if (!mapping) return res.status(404).json({ success: false, error: { message: 'Mapping not found' } });
    await logAudit({ userId: req.user.userId, action: 'DELETE', resource: 'dm_client_platform', resourceId: mapping._id, before: mapping.toObject(), after: null, req });
    res.json({ success: true, message: 'Platform removed from client' });
  } catch (err) { next(err); }
};

// ─── Daily Logs ───────────────────────────────────────────────────────────────

exports.getDailyLogs = async (req, res, next) => {
  try {
    const { clientId, platformId, date } = req.query;
    const filter = {};
    if (clientId)  filter.client   = clientId;
    if (platformId) filter.platform = platformId;
    if (date)      filter.date     = date;

    const logs = await DMDailyLog.find(filter)
      .populate('completedBy', 'name')
      .populate('task', 'title hasCount')
      .populate('customField', 'label fieldType');
    res.json({ success: true, data: { logs } });
  } catch (err) { next(err); }
};

// GET today's dashboard: clients × platforms × tasks with completion state
exports.getDailyDashboard = async (req, res, next) => {
  try {
    const date = req.query.date || dayjs().format('YYYY-MM-DD');
    const userId = req.user.userId;
    const role   = req.user.role;

    // Find active client-platform mappings
    const mappingFilter = { deletedAt: null, isActive: true };
    if (!['SUPERADMIN', 'ADMIN', 'SUBADMIN', 'DEPT_HEAD'].includes(role)) {
      mappingFilter.assignedTo = userId;
    }

    const mappings = await DMClientPlatform.find(mappingFilter)
      .populate('client', 'name companyName')
      .populate('platform', 'name code sortOrder')
      .sort({ 'platform.sortOrder': 1 });

    if (mappings.length === 0) return res.json({ success: true, data: { dashboard: [] } });

    const platformIds = [...new Set(mappings.map((m) => m.platform._id.toString()))];
    const clientIds   = [...new Set(mappings.map((m) => m.client._id.toString()))];

    // Load all tasks for these platforms
    const allTasks = await DMDailyTask.find({
      platform: { $in: platformIds }, deletedAt: null, isActive: true,
    }).sort({ sortOrder: 1 });

    // Load all custom fields for these client-platform combos
    const allCustomFields = await DMCustomField.find({
      platform: { $in: platformIds }, deletedAt: null,
      $or: [{ client: { $in: clientIds } }, { client: null }],
    }).sort({ sortOrder: 1 });

    // Load today's logs
    const logs = await DMDailyLog.find({ date, client: { $in: clientIds } })
      .populate('completedBy', 'name');
    const logMap = {};
    logs.forEach((l) => {
      const key = l.task
        ? `${l.client}_${l.platform}_task_${l.task}`
        : `${l.client}_${l.platform}_cf_${l.customField}`;
      logMap[key] = l;
    });

    // Build dashboard grouped by client
    const clientMap = {};
    mappings.forEach((m) => {
      const cid = m.client._id.toString();
      if (!clientMap[cid]) {
        clientMap[cid] = { client: m.client, platforms: [] };
      }
      const pid = m.platform._id.toString();
      const tasks = allTasks
        .filter((t) => t.platform.toString() === pid)
        .map((t) => {
          const key  = `${cid}_${pid}_task_${t._id}`;
          const log  = logMap[key];
          return { task: t, log: log || null, isCompleted: log?.isCompleted || false };
        });

      const customFields = allCustomFields
        .filter((cf) => cf.platform.toString() === pid && (!cf.client || cf.client.toString() === cid))
        .map((cf) => {
          const key = `${cid}_${pid}_cf_${cf._id}`;
          const log = logMap[key];
          return { field: cf, log: log || null, isCompleted: log?.isCompleted || false };
        });

      const total     = tasks.length + customFields.length;
      const completed = tasks.filter((t) => t.isCompleted).length + customFields.filter((cf) => cf.isCompleted).length;

      clientMap[cid].platforms.push({
        mapping: m, tasks, customFields, total, completed,
        pct: total > 0 ? Math.round((completed / total) * 100) : 0,
      });
    });

    const dashboard = Object.values(clientMap);
    res.json({ success: true, data: { dashboard, date } });
  } catch (err) { next(err); }
};

exports.logTask = async (req, res, next) => {
  try {
    const { clientId, platformId, taskId, customFieldId, date, isCompleted, count, customValue, notes } = req.body;
    const logDate = date || dayjs().format('YYYY-MM-DD');

    const filter = { client: clientId, platform: platformId, date: logDate };
    if (taskId)       filter.task        = taskId;
    if (customFieldId) filter.customField = customFieldId;

    const update = {
      isCompleted: !!isCompleted,
      completedAt: isCompleted ? new Date() : null,
      completedBy: isCompleted ? req.user.userId : null,
      count: count ?? null,
      customValue: customValue ?? null,
      notes: notes || '',
      updatedBy: req.user.userId,
    };

    const log = await DMDailyLog.findOneAndUpdate(
      filter,
      { $set: update, $setOnInsert: { createdBy: req.user.userId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('completedBy', 'name');

    res.json({ success: true, data: { log } });
  } catch (err) { next(err); }
};

// ─── DM ↔ GD Pipeline ────────────────────────────────────────────────────────

exports.getDMGDPipeline = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const role   = req.user.role;

    // DM exec sees their own assigned tasks; head/admin see all
    const matchBase = { sourceModule: 'dm', deletedAt: null };
    if (!['SUPERADMIN', 'ADMIN', 'SUBADMIN', 'DEPT_HEAD'].includes(role)) {
      matchBase.assignedBy = new mongoose.Types.ObjectId(userId);
    }

    const [statusCounts, pendingTasks, stuckTasks] = await Promise.all([
      GDTask.aggregate([
        { $match: matchBase },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      GDTask.find({ ...matchBase, status: { $in: ['new', 'in_progress', 'revision_requested'] } })
        .populate('client', 'companyName')
        .populate('assignedTo', 'name')
        .sort('-createdAt')
        .limit(20),
      // Stuck = submitted for more than 2 days without action
      GDTask.find({
        ...matchBase,
        status: 'submitted',
        submittedAt: { $lt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      })
        .populate('client', 'companyName')
        .populate('assignedTo', 'name'),
    ]);

    const counts = {};
    statusCounts.forEach(s => { counts[s._id] = s.count; });

    res.json({ success: true, data: { counts, pendingTasks, stuckTasks } });
  } catch (err) { next(err); }
};

// Create GD task from DM context (pre-fills sourceModule + assignedBy)
exports.createGDTask = async (req, res, next) => {
  try {
    const { title, brief, type, priority, client, assignedTo, referenceLinks, dueDate } = req.body;
    if (!title || !type || !client) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'title, type, client required' } });
    }

    const task = await GDTask.create({
      title, brief, type, priority: priority || 'medium',
      client, assignedTo: assignedTo || null,
      referenceLinks: referenceLinks || [],
      dueDate: dueDate || null,
      sourceModule: 'dm',
      assignedBy:  req.user.userId,
      createdBy:   req.user.userId,
      updatedBy:   req.user.userId,
    });

    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'gd_task', resourceId: task._id, after: task.toObject(), req });

    if (assignedTo && req.io) {
      req.io.to(`user:${assignedTo}`).emit('notification', {
        type: 'gd:task:assigned',
        message: `New GD task from DM: ${title}`,
        taskId: task._id,
      });
    }

    res.status(201).json({ success: true, data: task, message: 'GD task created from DM' });
  } catch (err) { next(err); }
};

// ─── Head Dashboard ───────────────────────────────────────────────────────────

exports.getHeadDashboard = async (req, res, next) => {
  try {
    const date = req.query.date || dayjs().format('YYYY-MM-DD');

    const mappings = await DMClientPlatform.find({ deletedAt: null, isActive: true })
      .populate('client', 'name companyName')
      .populate('platform', 'name code')
      .populate('assignedTo', 'name');

    const platformIds = [...new Set(mappings.map((m) => m.platform._id.toString()))];
    const taskCounts  = await DMDailyTask.aggregate([
      { $match: { platform: { $in: platformIds.map((id) => new mongoose.Types.ObjectId(id)) }, deletedAt: null, isActive: true } },
      { $group: { _id: '$platform', count: { $sum: 1 } } },
    ]);
    const taskCountMap = {};
    taskCounts.forEach((t) => { taskCountMap[t._id.toString()] = t.count; });

    const logs = await DMDailyLog.find({ date, isCompleted: true });
    const completedMap = {};
    logs.forEach((l) => {
      const key = `${l.client}_${l.platform}`;
      completedMap[key] = (completedMap[key] || 0) + 1;
    });

    const rows = mappings.map((m) => {
      const key       = `${m.client._id}_${m.platform._id}`;
      const total     = taskCountMap[m.platform._id.toString()] || 0;
      const completed = completedMap[key] || 0;
      return {
        client: m.client, platform: m.platform,
        assignedTo: m.assignedTo,
        total, completed,
        pct: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });

    res.json({ success: true, data: { rows, date } });
  } catch (err) { next(err); }
};
