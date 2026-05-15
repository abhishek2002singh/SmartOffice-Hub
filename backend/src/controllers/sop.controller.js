const SOPCategory      = require('../models/SOPCategory');
const SOP              = require('../models/SOP');
const SOPVersion       = require('../models/SOPVersion');
const SOPApproval      = require('../models/SOPApproval');
const SOPAcknowledgement = require('../models/SOPAcknowledgement');
const { logAudit }     = require('../middleware/auditLogger');

const DEFAULT_CATEGORIES = [
  { name: 'HR & Onboarding',   description: 'Joining process, leave policy, attendance, dress code',          iconName: 'Users',       sortOrder: 1 },
  { name: 'Sales & CRM',       description: 'Lead handling, client communication, follow-up SOPs',            iconName: 'Target',      sortOrder: 2 },
  { name: 'Digital Marketing', description: 'Platform SOPs, content calendar, reporting process',             iconName: 'MonitorCheck', sortOrder: 3 },
  { name: 'Development & GD',  description: 'Coding standards, design workflow, delivery process',            iconName: 'Code2',       sortOrder: 4 },
  { name: 'Finance & Admin',   description: 'Expense rules, office policies, reimbursement process',          iconName: 'DollarSign',  sortOrder: 5 },
  { name: 'General / Common',  description: 'Company-wide policies applicable to all employees',              iconName: 'Building',    sortOrder: 6 },
];

const slugify = (text) =>
  text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

// ─── Categories ───────────────────────────────────────────────────────────────

exports.seedDefaultCategories = async (req, res) => {
  try {
    const userId = req.user.userId;
    for (const cat of DEFAULT_CATEGORIES) {
      await SOPCategory.findOneAndUpdate(
        { name: cat.name, deletedAt: null },
        { ...cat, createdBy: userId, updatedBy: userId },
        { upsert: true },
      );
    }
    const categories = await SOPCategory.find({ deletedAt: null }).sort({ sortOrder: 1 });
    res.json({ success: true, data: { categories } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.listCategories = async (req, res) => {
  try {
    const categories = await SOPCategory.find({ deletedAt: null }).sort({ sortOrder: 1 });
    res.json({ success: true, data: { categories } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description, departmentId, iconName, sortOrder } = req.body;
    if (!name) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'name is required' } });
    const userId = req.user.userId;
    const cat = await SOPCategory.create({ name, description, departmentId, iconName, sortOrder, createdBy: userId, updatedBy: userId });
    await logAudit({ userId, action: 'CREATE', resource: 'sop_category', resourceId: cat._id, after: cat.toObject(), req });
    res.status(201).json({ success: true, data: { category: cat } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { name, description, departmentId, iconName, sortOrder } = req.body;
    const userId = req.user.userId;
    const cat = await SOPCategory.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { name, description, departmentId, iconName, sortOrder, updatedBy: userId },
      { new: true },
    );
    if (!cat) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } });
    await logAudit({ userId, action: 'UPDATE', resource: 'sop_category', resourceId: cat._id, after: cat.toObject(), req });
    res.json({ success: true, data: { category: cat } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const cat = await SOPCategory.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date(), updatedBy: userId },
      { new: true },
    );
    if (!cat) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } });
    await logAudit({ userId, action: 'DELETE', resource: 'sop_category', resourceId: cat._id, req });
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ─── SOP CRUD ─────────────────────────────────────────────────────────────────

exports.listSOPs = async (req, res) => {
  try {
    const { status, categoryId, tag, q, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const filter = { deletedAt: null };

    // Non-admins only see published SOPs
    const adminRoles = ['SUPERADMIN', 'ADMIN', 'SUBADMIN', 'DEPT_HEAD'];
    if (!adminRoles.includes(req.user.role)) {
      filter.status = 'published';
    } else if (status) {
      filter.status = status;
    }

    if (categoryId) filter.categoryId = categoryId;
    if (tag)        filter.tags = tag;
    if (q)          filter.$text = { $search: q };

    const skip = (Number(page) - 1) * Number(limit);
    const [sops, total] = await Promise.all([
      SOP.find(filter).populate('categoryId', 'name iconName').sort(sort).skip(skip).limit(Number(limit)),
      SOP.countDocuments(filter),
    ]);
    res.json({ success: true, data: { sops, total, page: Number(page), pages: Math.ceil(total / Number(limit)) } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.createSOP = async (req, res) => {
  try {
    const { title, categoryId, description, content, applicableTo, applicableIds, mandatory, acknowledgementDeadlineDays, tags } = req.body;
    if (!title || !categoryId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'title and categoryId are required' } });
    }
    const userId = req.user.userId;

    let slug = slugify(title);
    const existing = await SOP.findOne({ slug, deletedAt: null });
    if (existing) slug = `${slug}-${Date.now()}`;

    const sop = await SOP.create({
      title, slug, categoryId, description, content: content || '',
      applicableTo, applicableIds, mandatory, acknowledgementDeadlineDays, tags,
      currentVersion: 1, status: 'draft',
      createdBy: userId, lastUpdatedBy: userId, updatedBy: userId,
    });

    // Create version 1
    await SOPVersion.create({
      sopId: sop._id, versionNumber: 1, content: content || '',
      changeLog: 'Initial version', status: 'draft', createdBy: userId,
    });

    await logAudit({ userId, action: 'CREATE', resource: 'sop', resourceId: sop._id, after: sop.toObject(), req });
    res.status(201).json({ success: true, data: { sop } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.getSOPById = async (req, res) => {
  try {
    const sop = await SOP.findOne({ _id: req.params.id, deletedAt: null })
      .populate('categoryId', 'name iconName')
      .populate('createdBy', 'name email')
      .populate('publishedBy', 'name email');
    if (!sop) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'SOP not found' } });

    const adminRoles = ['SUPERADMIN', 'ADMIN', 'SUBADMIN', 'DEPT_HEAD'];
    if (!adminRoles.includes(req.user.role) && sop.status !== 'published') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'SOP not published' } });
    }

    // Current approval (if in_review)
    let pendingApproval = null;
    if (sop.status === 'in_review') {
      pendingApproval = await SOPApproval.findOne({ sopId: sop._id, versionNumber: sop.currentVersion, status: 'pending', deletedAt: null })
        .populate('requestedBy', 'name')
        .populate('reviewerId', 'name');
    }

    // User's acknowledgement
    const myAck = await SOPAcknowledgement.findOne({
      sopId: sop._id, sopVersionNumber: sop.currentVersion,
      userId: req.user.userId, deletedAt: null,
    });

    res.json({ success: true, data: { sop, pendingApproval, acknowledged: !!myAck, myAck } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.updateSOP = async (req, res) => {
  try {
    const userId = req.user.userId;
    const sop = await SOP.findOne({ _id: req.params.id, deletedAt: null });
    if (!sop) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'SOP not found' } });

    const { title, categoryId, description, content, applicableTo, applicableIds, mandatory, acknowledgementDeadlineDays, tags, changeLog } = req.body;

    const before = sop.toObject();

    // If published — bump version to draft
    if (sop.status === 'published') {
      const newVersion = sop.currentVersion + 1;
      sop.currentVersion = newVersion;
      sop.status = 'draft';
      await SOPVersion.create({
        sopId: sop._id, versionNumber: newVersion,
        content: content || sop.content,
        changeLog: changeLog || `Version ${newVersion}`,
        status: 'draft', createdBy: userId,
      });
    } else {
      // Update existing draft version
      await SOPVersion.findOneAndUpdate(
        { sopId: sop._id, versionNumber: sop.currentVersion },
        { content: content || sop.content, updatedAt: new Date() },
      );
    }

    if (title)                         sop.title = title;
    if (categoryId)                    sop.categoryId = categoryId;
    if (description !== undefined)     sop.description = description;
    if (content !== undefined)         sop.content = content;
    if (applicableTo)                  sop.applicableTo = applicableTo;
    if (applicableIds)                 sop.applicableIds = applicableIds;
    if (mandatory !== undefined)       sop.mandatory = mandatory;
    if (acknowledgementDeadlineDays)   sop.acknowledgementDeadlineDays = acknowledgementDeadlineDays;
    if (tags)                          sop.tags = tags;
    sop.lastUpdatedBy = userId;
    sop.updatedBy = userId;

    await sop.save();
    await logAudit({ userId, action: 'UPDATE', resource: 'sop', resourceId: sop._id, before, after: sop.toObject(), req });
    res.json({ success: true, data: { sop } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.deleteSOP = async (req, res) => {
  try {
    const userId = req.user.userId;
    const sop = await SOP.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date(), updatedBy: userId },
      { new: true },
    );
    if (!sop) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'SOP not found' } });
    await logAudit({ userId, action: 'DELETE', resource: 'sop', resourceId: sop._id, req });
    res.json({ success: true, message: 'SOP deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ─── Versioning ───────────────────────────────────────────────────────────────

exports.getVersionHistory = async (req, res) => {
  try {
    const sop = await SOP.findOne({ _id: req.params.id, deletedAt: null });
    if (!sop) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'SOP not found' } });

    const versions = await SOPVersion.find({ sopId: sop._id })
      .populate('createdBy', 'name email')
      .sort({ versionNumber: -1 });

    res.json({ success: true, data: { sop: { _id: sop._id, title: sop.title, currentVersion: sop.currentVersion }, versions } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ─── Approval Workflow ────────────────────────────────────────────────────────

exports.submitForApproval = async (req, res) => {
  try {
    const userId = req.user.userId;
    const sop = await SOP.findOne({ _id: req.params.id, deletedAt: null });
    if (!sop) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'SOP not found' } });
    if (sop.status !== 'draft') {
      return res.status(409).json({ success: false, error: { code: 'INVALID_STATUS', message: `Cannot submit SOP in '${sop.status}' status` } });
    }

    sop.status = 'in_review';
    sop.updatedBy = userId;
    await sop.save();

    const approval = await SOPApproval.create({
      sopId: sop._id, versionNumber: sop.currentVersion,
      requestedBy: userId, requestedAt: new Date(), status: 'pending',
    });

    await logAudit({ userId, action: 'UPDATE', resource: 'sop', resourceId: sop._id, after: { status: 'in_review', approvalId: approval._id }, req });
    res.json({ success: true, data: { sop, approval } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.reviewApproval = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { decision, reviewComments } = req.body;

    if (!['approved', 'rejected', 'changes_requested'].includes(decision)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'decision must be approved, rejected, or changes_requested' } });
    }

    const sop = await SOP.findOne({ _id: req.params.id, deletedAt: null });
    if (!sop) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'SOP not found' } });
    if (sop.status !== 'in_review') {
      return res.status(409).json({ success: false, error: { code: 'INVALID_STATUS', message: 'SOP is not under review' } });
    }

    const approval = await SOPApproval.findOneAndUpdate(
      { sopId: sop._id, versionNumber: sop.currentVersion, status: 'pending', deletedAt: null },
      { status: decision, reviewerId: userId, reviewedAt: new Date(), reviewComments: reviewComments || '' },
      { new: true },
    );
    if (!approval) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Pending approval not found' } });

    // On reject or changes_requested — push back to draft
    if (decision !== 'approved') {
      sop.status = 'draft';
      sop.updatedBy = userId;
      await sop.save();
    }

    await logAudit({ userId, action: 'UPDATE', resource: 'sop_approval', resourceId: approval._id, after: { decision }, req });
    res.json({ success: true, data: { sop, approval } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.publishSOP = async (req, res) => {
  try {
    const userId = req.user.userId;
    const sop = await SOP.findOne({ _id: req.params.id, deletedAt: null });
    if (!sop) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'SOP not found' } });

    if (!['in_review', 'draft'].includes(sop.status)) {
      return res.status(409).json({ success: false, error: { code: 'INVALID_STATUS', message: `Cannot publish SOP in '${sop.status}' status` } });
    }

    const now = new Date();
    sop.status = 'published';
    sop.publishedBy = userId;
    sop.publishedAt = now;
    sop.updatedBy = userId;
    await sop.save();

    await SOPVersion.findOneAndUpdate(
      { sopId: sop._id, versionNumber: sop.currentVersion },
      { status: 'published', publishedAt: now },
    );

    await logAudit({ userId, action: 'UPDATE', resource: 'sop', resourceId: sop._id, after: { status: 'published' }, req });
    res.json({ success: true, data: { sop } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.archiveSOP = async (req, res) => {
  try {
    const userId = req.user.userId;
    const sop = await SOP.findOne({ _id: req.params.id, deletedAt: null });
    if (!sop) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'SOP not found' } });
    if (sop.status === 'archived') {
      return res.status(409).json({ success: false, error: { code: 'ALREADY_ARCHIVED', message: 'SOP is already archived' } });
    }

    sop.status = 'archived';
    sop.updatedBy = userId;
    await sop.save();

    await SOPVersion.updateMany({ sopId: sop._id, status: 'published' }, { status: 'archived' });

    await logAudit({ userId, action: 'UPDATE', resource: 'sop', resourceId: sop._id, after: { status: 'archived' }, req });
    res.json({ success: true, data: { sop } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.getApprovalInbox = async (req, res) => {
  try {
    const approvals = await SOPApproval.find({ status: 'pending', deletedAt: null })
      .populate({ path: 'sopId', select: 'title currentVersion categoryId', populate: { path: 'categoryId', select: 'name' } })
      .populate('requestedBy', 'name email')
      .sort({ requestedAt: -1 });
    res.json({ success: true, data: { approvals } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ─── Acknowledgement ──────────────────────────────────────────────────────────

exports.acknowledgeSOP = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { signature } = req.body;

    const sop = await SOP.findOne({ _id: req.params.id, deletedAt: null });
    if (!sop) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'SOP not found' } });
    if (sop.status !== 'published') {
      return res.status(400).json({ success: false, error: { code: 'NOT_PUBLISHED', message: 'Can only acknowledge published SOPs' } });
    }

    const User = require('../models/User');
    const user = await User.findById(userId, 'name');
    const now  = new Date();
    const text = `I, ${user?.name || 'Employee'}, have read and understood ${sop.title} v${sop.currentVersion} on ${now.toDateString()}.`;

    const existing = await SOPAcknowledgement.findOne({ sopId: sop._id, sopVersionNumber: sop.currentVersion, userId, deletedAt: null });
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'ALREADY_ACKNOWLEDGED', message: 'You have already acknowledged this SOP version' } });
    }

    const ack = await SOPAcknowledgement.create({
      sopId: sop._id, sopVersionNumber: sop.currentVersion, userId,
      acknowledgedAt: now, signature: signature || '', acknowledgementText: text,
      ipAddress: req.ip || '', userAgent: req.headers['user-agent'] || '', deletedAt: null,
    });

    await logAudit({ userId, action: 'CREATE', resource: 'sop_acknowledgement', resourceId: ack._id, after: { sopId: sop._id, version: sop.currentVersion }, req });
    res.json({ success: true, data: { acknowledgement: ack } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.getMyPendingSOPs = async (req, res) => {
  try {
    const userId = req.user.userId;

    // All published mandatory SOPs
    const publishedSOPs = await SOP.find({ status: 'published', mandatory: true, deletedAt: null })
      .populate('categoryId', 'name iconName');

    // Already acknowledged by me
    const acknowledged = await SOPAcknowledgement.find({ userId, deletedAt: null }).distinct('sopId');
    const acknowledgedSet = new Set(acknowledged.map(id => id.toString()));

    const pending = publishedSOPs.filter(s => !acknowledgedSet.has(s._id.toString()));
    res.json({ success: true, data: { pending, total: pending.length } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.getMyAcknowledgements = async (req, res) => {
  try {
    const userId = req.user.userId;
    const acks = await SOPAcknowledgement.find({ userId, deletedAt: null })
      .populate({ path: 'sopId', select: 'title currentVersion categoryId', populate: { path: 'categoryId', select: 'name' } })
      .sort({ acknowledgedAt: -1 });
    res.json({ success: true, data: { acknowledgements: acks } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.getAcknowledgementReport = async (req, res) => {
  try {
    const sop = await SOP.findOne({ _id: req.params.id, deletedAt: null });
    if (!sop) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'SOP not found' } });

    const acks = await SOPAcknowledgement.find({ sopId: sop._id, deletedAt: null })
      .populate('userId', 'name email role')
      .sort({ acknowledgedAt: -1 });

    res.json({ success: true, data: { sop: { _id: sop._id, title: sop.title, currentVersion: sop.currentVersion }, acknowledgements: acks, totalAcknowledged: acks.length } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};
