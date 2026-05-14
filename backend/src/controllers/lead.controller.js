const mongoose = require('mongoose');
const Lead       = require('../models/Lead');
const { convertLeadToClient } = require('./client.controller');
const LeadSource = require('../models/LeadSource');
const Activity   = require('../models/Activity');
const User       = require('../models/User');
const AppError   = require('../utils/AppError');
const { logAudit } = require('../middleware/auditLogger');
const {
  createLeadSchema,
  updateLeadSchema,
  assignLeadSchema,
  stageChangeSchema,
  activitySchema,
  bulkImportRowSchema,
} = require('../validators/lead.validator');

// ─── Round-Robin State (in-memory, resets on restart — acceptable for Phase 2) ───
const rrState = { index: 0 };

const getNextBDE = async () => {
  const bdes = await User.find({
    role: { $in: ['TEAM_MEMBER', 'DEPT_HEAD'] },
    deletedAt: null,
  }).select('_id').lean();
  if (!bdes.length) return null;
  const next = bdes[rrState.index % bdes.length];
  rrState.index++;
  return next._id;
};

// ─── Duplicate Check ─────────────────────────────────────────────────────────
const findDuplicate = async (mobile, email, excludeId = null) => {
  const query = { deletedAt: null };
  if (excludeId) query._id = { $ne: excludeId };

  if (mobile && email && email !== '') {
    query.$or = [{ mobile }, { email }];
  } else {
    query.mobile = mobile;
  }
  return Lead.findOne(query).lean();
};

// ─── LIST ─────────────────────────────────────────────────────────────────────
exports.listLeads = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, sort = '-createdAt', stage, source, assignedTo, priority, q } = req.query;

    const filter = { deletedAt: null };
    if (stage)      filter.stage = stage;
    if (source)     filter.source = source;
    if (assignedTo) filter.assignedTo = assignedTo === 'unassigned' ? null : assignedTo;
    if (priority)   filter.priority = priority;
    if (q) {
      filter.$or = [
        { name:    { $regex: q, $options: 'i' } },
        { mobile:  { $regex: q, $options: 'i' } },
        { email:   { $regex: q, $options: 'i' } },
        { company: { $regex: q, $options: 'i' } },
      ];
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Lead.countDocuments(filter);
    const leads = await Lead.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .populate('source', 'name code')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name')
      .lean();

    res.json({ success: true, data: { leads, total, page: Number(page), limit: Number(limit) } });
  } catch (err) { next(err); }
};

// ─── GET ONE ──────────────────────────────────────────────────────────────────
exports.getLead = async (req, res, next) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, deletedAt: null })
      .populate('source', 'name code')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name')
      .lean();

    if (!lead) return next(new AppError('Lead not found', 404, 'NOT_FOUND'));
    res.json({ success: true, data: { lead } });
  } catch (err) { next(err); }
};

// ─── CREATE ───────────────────────────────────────────────────────────────────
exports.createLead = async (req, res, next) => {
  try {
    const parsed = createLeadSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('Validation error', 400, 'VALIDATION_ERROR', parsed.error.flatten()));

    const data = parsed.data;

    const sourceDoc = await LeadSource.findById(data.source);
    if (!sourceDoc) return next(new AppError('Invalid source', 400, 'INVALID_SOURCE'));

    const dup = await findDuplicate(data.mobile, data.email);
    if (dup) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_LEAD',
          message: 'A lead with this mobile or email already exists',
          existingId: dup._id,
        },
      });
    }

    const lead = await Lead.create({ ...data, createdBy: req.user.userId });

    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'lead', resourceId: lead._id, after: lead.toObject(), req });
    res.status(201).json({ success: true, data: { lead }, message: 'Lead created' });
  } catch (err) { next(err); }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────
exports.updateLead = async (req, res, next) => {
  try {
    const parsed = updateLeadSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('Validation error', 400, 'VALIDATION_ERROR', parsed.error.flatten()));

    const before = await Lead.findOne({ _id: req.params.id, deletedAt: null }).lean();
    if (!before) return next(new AppError('Lead not found', 404, 'NOT_FOUND'));

    const data = parsed.data;

    if (data.mobile || data.email !== undefined) {
      const mobile = data.mobile || before.mobile;
      const email  = data.email  !== undefined ? data.email : before.email;
      const dup = await findDuplicate(mobile, email, req.params.id);
      if (dup) {
        return res.status(409).json({
          success: false,
          error: { code: 'DUPLICATE_LEAD', message: 'Another lead with this mobile or email exists', existingId: dup._id },
        });
      }
    }

    const after = await Lead.findByIdAndUpdate(
      req.params.id,
      { ...data, updatedBy: req.user.userId },
      { new: true }
    ).populate('source', 'name code').populate('assignedTo', 'name email').lean();

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'lead', resourceId: after._id, before, after, req });
    res.json({ success: true, data: { lead: after }, message: 'Lead updated' });
  } catch (err) { next(err); }
};

// ─── SOFT DELETE ──────────────────────────────────────────────────────────────
exports.deleteLead = async (req, res, next) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, deletedAt: null });
    if (!lead) return next(new AppError('Lead not found', 404, 'NOT_FOUND'));

    const before = lead.toObject();
    lead.deletedAt = new Date();
    lead.updatedBy = req.user.userId;
    await lead.save();

    await logAudit({ userId: req.user.userId, action: 'DELETE', resource: 'lead', resourceId: lead._id, before, req });
    res.json({ success: true, message: 'Lead deleted' });
  } catch (err) { next(err); }
};

// ─── ASSIGN ───────────────────────────────────────────────────────────────────
exports.assignLead = async (req, res, next) => {
  try {
    const parsed = assignLeadSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('Validation error', 400, 'VALIDATION_ERROR', parsed.error.flatten()));

    const lead = await Lead.findOne({ _id: req.params.id, deletedAt: null });
    if (!lead) return next(new AppError('Lead not found', 404, 'NOT_FOUND'));

    const assignee = await User.findOne({ _id: parsed.data.assignedTo, deletedAt: null });
    if (!assignee) return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));

    const before = lead.toObject();
    lead.assignedTo = assignee._id;
    lead.updatedBy  = req.user.userId;
    if (lead.stage === 'new') lead.stage = 'assigned';
    await lead.save();

    await Activity.create({
      lead: lead._id, type: 'assignment',
      from: before.assignedTo?.toString() || null,
      to:   assignee._id.toString(),
      note: `Assigned to ${assignee.name}`,
      createdBy: req.user.userId,
    });

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'lead', resourceId: lead._id, before, after: lead.toObject(), req });
    res.json({ success: true, data: { lead }, message: `Lead assigned to ${assignee.name}` });
  } catch (err) { next(err); }
};

// ─── AUTO-ASSIGN (Round-Robin) ────────────────────────────────────────────────
exports.autoAssignLead = async (req, res, next) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, deletedAt: null });
    if (!lead) return next(new AppError('Lead not found', 404, 'NOT_FOUND'));

    const assigneeId = await getNextBDE();
    if (!assigneeId) return next(new AppError('No active team members for auto-assignment', 400, 'NO_AGENTS'));

    const before = lead.toObject();
    const assignee = await User.findById(assigneeId).select('name').lean();

    lead.assignedTo = assigneeId;
    lead.updatedBy  = req.user.userId;
    if (lead.stage === 'new') lead.stage = 'assigned';
    await lead.save();

    await Activity.create({
      lead: lead._id, type: 'assignment',
      to:   assigneeId.toString(),
      note: `Auto-assigned to ${assignee.name} (round-robin)`,
      createdBy: req.user.userId,
    });

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'lead', resourceId: lead._id, before, after: lead.toObject(), req });
    res.json({ success: true, data: { lead, assignedTo: assignee }, message: `Auto-assigned to ${assignee.name}` });
  } catch (err) { next(err); }
};

// ─── CHANGE STAGE ─────────────────────────────────────────────────────────────
exports.changeStage = async (req, res, next) => {
  try {
    const parsed = stageChangeSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('Validation error', 400, 'VALIDATION_ERROR', parsed.error.flatten()));

    const lead = await Lead.findOne({ _id: req.params.id, deletedAt: null });
    if (!lead) return next(new AppError('Lead not found', 404, 'NOT_FOUND'));

    if (parsed.data.stage === lead.stage) return res.json({ success: true, data: { lead }, message: 'No stage change' });

    // Stage transition rules
    const REQUIRES_ASSIGNED = ['proposal', 'negotiation', 'won'];
    if (REQUIRES_ASSIGNED.includes(parsed.data.stage) && !lead.assignedTo) {
      return next(new AppError(`Lead must be assigned before moving to "${parsed.data.stage}"`, 400, 'STAGE_RULE_VIOLATION'));
    }

    const before = lead.toObject();
    const oldStage = lead.stage;

    lead.stage     = parsed.data.stage;
    lead.updatedBy = req.user.userId;
    if (parsed.data.stage === 'lost' && parsed.data.lostReason) lead.lostReason = parsed.data.lostReason;
    await lead.save();

    await Activity.create({
      lead: lead._id, type: 'stage_change',
      from: oldStage, to: parsed.data.stage,
      note: parsed.data.note || `Stage changed from ${oldStage} to ${parsed.data.stage}`,
      createdBy: req.user.userId,
    });

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'lead', resourceId: lead._id, before, after: lead.toObject(), req });

    let client = null;
    if (parsed.data.stage === 'won') {
      client = await convertLeadToClient(lead._id.toString(), req.user.userId);
    }

    res.json({ success: true, data: { lead, client }, message: 'Stage updated' });
  } catch (err) { next(err); }
};

// ─── ACTIVITIES ───────────────────────────────────────────────────────────────
exports.addActivity = async (req, res, next) => {
  try {
    const parsed = activitySchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('Validation error', 400, 'VALIDATION_ERROR', parsed.error.flatten()));

    const lead = await Lead.findOne({ _id: req.params.id, deletedAt: null });
    if (!lead) return next(new AppError('Lead not found', 404, 'NOT_FOUND'));

    const activity = await Activity.create({
      lead: lead._id, ...parsed.data, createdBy: req.user.userId,
    });

    res.status(201).json({ success: true, data: { activity }, message: 'Activity added' });
  } catch (err) { next(err); }
};

exports.getActivities = async (req, res, next) => {
  try {
    const activities = await Activity.find({ lead: req.params.id })
      .sort('-createdAt')
      .populate('createdBy', 'name')
      .lean();
    res.json({ success: true, data: { activities } });
  } catch (err) { next(err); }
};

// ─── LEAD SOURCES LIST ────────────────────────────────────────────────────────
exports.listSources = async (_req, res, next) => {
  try {
    const sources = await LeadSource.find({ isActive: true, deletedAt: null }).sort('name').lean();
    res.json({ success: true, data: { sources } });
  } catch (err) { next(err); }
};

// ─── BULK IMPORT ──────────────────────────────────────────────────────────────
exports.bulkImport = async (req, res, next) => {
  try {
    const { rows, sourceId } = req.body;

    if (!Array.isArray(rows) || rows.length === 0)
      return next(new AppError('rows array is required', 400, 'VALIDATION_ERROR'));

    const sourceDoc = await LeadSource.findById(sourceId);
    if (!sourceDoc) return next(new AppError('Invalid source', 400, 'INVALID_SOURCE'));

    const batchId   = `batch_${Date.now()}`;
    const created   = [];
    const skipped   = [];
    const errors    = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const parsed = bulkImportRowSchema.safeParse(row);

      if (!parsed.success) {
        errors.push({ row: i + 1, reason: 'Validation failed', details: parsed.error.flatten() });
        continue;
      }

      const { mobile, email } = parsed.data;
      const dup = await findDuplicate(mobile, email || '');
      if (dup) {
        skipped.push({ row: i + 1, mobile, reason: 'Duplicate' });
        continue;
      }

      try {
        const lead = await Lead.create({
          ...parsed.data,
          source:      sourceDoc._id,
          importBatch: batchId,
          isDuplicate: false,
          createdBy:   req.user.userId,
        });
        created.push(lead._id);
      } catch (e) {
        errors.push({ row: i + 1, reason: e.message });
      }
    }

    if (created.length) {
      await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'lead', resourceId: null, after: { bulkImport: true, count: created.length, batchId }, req });
    }

    res.json({
      success: true,
      data: { created: created.length, skipped: skipped.length, errors: errors.length, batchId, skippedRows: skipped, errorRows: errors },
      message: `${created.length} leads imported, ${skipped.length} duplicates skipped`,
    });
  } catch (err) { next(err); }
};

// ─── CSV TEMPLATE DOWNLOAD ────────────────────────────────────────────────────
exports.downloadTemplate = (_req, res) => {
  const headers = ['name', 'mobile', 'email', 'company', 'designation', 'city', 'description', 'priority'].join(',');
  const example = ['John Doe', '9999999999', 'john@example.com', 'Acme Corp', 'CEO', 'Delhi', 'Interested in SEO', 'medium'].join(',');
  const csv = `${headers}\n${example}\n`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="lead_import_template.csv"');
  res.send(csv);
};

// ─── STATS ────────────────────────────────────────────────────────────────────
exports.getStats = async (_req, res, next) => {
  try {
    const [stageStats, sourceStats, totalLeads, totalThisMonth] = await Promise.all([
      Lead.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: '$stage', count: { $sum: 1 } } },
      ]),
      Lead.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $lookup: { from: 'leadsources', localField: '_id', foreignField: '_id', as: 'sourceInfo' } },
        { $project: { count: 1, name: { $arrayElemAt: ['$sourceInfo.name', 0] } } },
      ]),
      Lead.countDocuments({ deletedAt: null }),
      Lead.countDocuments({
        deletedAt: null,
        createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      }),
    ]);

    res.json({ success: true, data: { totalLeads, totalThisMonth, stageStats, sourceStats } });
  } catch (err) { next(err); }
};
