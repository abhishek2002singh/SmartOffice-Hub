const dayjs = require('dayjs');
const OnboardingChecklist        = require('../models/OnboardingChecklist');
const EmployeeOnboardingProgress = require('../models/EmployeeOnboardingProgress');
const Employee                   = require('../models/Employee');
const { logAudit }               = require('../middleware/auditLogger');

// ─── Templates (HR/Admin) ─────────────────────────────────────────────────────

exports.listTemplates = async (req, res) => {
  try {
    const templates = await OnboardingChecklist.find({ deletedAt: null }).sort({ isDefault: -1, name: 1 });
    res.json({ success: true, data: { templates } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.createTemplate = async (req, res) => {
  try {
    const { name, description, applicableTo, applicableIds, items, isDefault } = req.body;
    if (!name) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'name is required' } });
    const userId = req.user.userId;
    const tmpl = await OnboardingChecklist.create({ name, description, applicableTo, applicableIds, items: items || [], isDefault, createdBy: userId, updatedBy: userId });
    await logAudit({ userId, action: 'CREATE', resource: 'onboarding_checklist', resourceId: tmpl._id, after: tmpl.toObject(), req });
    res.status(201).json({ success: true, data: { template: tmpl } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.getTemplate = async (req, res) => {
  try {
    const tmpl = await OnboardingChecklist.findOne({ _id: req.params.id, deletedAt: null });
    if (!tmpl) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } });
    res.json({ success: true, data: { template: tmpl } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.updateTemplate = async (req, res) => {
  try {
    const { name, description, applicableTo, applicableIds, items, isDefault } = req.body;
    const userId = req.user.userId;
    const tmpl = await OnboardingChecklist.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { name, description, applicableTo, applicableIds, items, isDefault, updatedBy: userId },
      { new: true },
    );
    if (!tmpl) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } });
    await logAudit({ userId, action: 'UPDATE', resource: 'onboarding_checklist', resourceId: tmpl._id, req });
    res.json({ success: true, data: { template: tmpl } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const userId = req.user.userId;
    const tmpl = await OnboardingChecklist.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date(), updatedBy: userId },
      { new: true },
    );
    if (!tmpl) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } });
    await logAudit({ userId, action: 'DELETE', resource: 'onboarding_checklist', resourceId: tmpl._id, req });
    res.json({ success: true, message: 'Template deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ─── Progress Assignment ──────────────────────────────────────────────────────

const buildProgressItems = (tmplItems, startDate) =>
  tmplItems
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(item => ({
      checklistItemId: item._id,
      title:           item.title,
      description:     item.description,
      type:            item.type,
      sopId:           item.sopId,
      daysFromJoining: item.daysFromJoining,
      mandatory:       item.mandatory,
      assignedRole:    item.assignedRole,
      sortOrder:       item.sortOrder,
      dueDate:         dayjs(startDate).add(item.daysFromJoining, 'day').toDate(),
      status:          'pending',
    }));

exports.assignOnboarding = async (req, res) => {
  try {
    const { employeeId, checklistId, startDate } = req.body;
    if (!employeeId || !checklistId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'employeeId and checklistId are required' } });
    }
    const userId = req.user.userId;
    const [emp, tmpl] = await Promise.all([
      Employee.findOne({ _id: employeeId, deletedAt: null }),
      OnboardingChecklist.findOne({ _id: checklistId, deletedAt: null }),
    ]);
    if (!emp)  return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee not found' } });
    if (!tmpl) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } });

    const start = startDate ? new Date(startDate) : (emp.dateOfJoining || new Date());
    const items = buildProgressItems(tmpl.items, start);

    const existing = await EmployeeOnboardingProgress.findOne({ employeeId, checklistId, deletedAt: null });
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'ALREADY_ASSIGNED', message: 'This checklist is already assigned to the employee' } });
    }

    const progress = await EmployeeOnboardingProgress.create({
      employeeId, checklistId, checklistName: tmpl.name, startDate: start,
      items, overallStatus: 'in_progress', createdBy: userId, deletedAt: null,
    });

    await logAudit({ userId, action: 'CREATE', resource: 'employee_onboarding', resourceId: progress._id, req });
    res.status(201).json({ success: true, data: { progress } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ─── Employee View ────────────────────────────────────────────────────────────

exports.getMyOnboarding = async (req, res) => {
  try {
    const userId = req.user.userId;
    const emp = await Employee.findOne({ userId, deletedAt: null });
    if (!emp) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee profile not found' } });

    const progressList = await EmployeeOnboardingProgress.find({ employeeId: emp._id, deletedAt: null })
      .populate('checklistId', 'name description');

    // Auto-mark overdue items
    const now = new Date();
    for (const prog of progressList) {
      let changed = false;
      prog.items.forEach(item => {
        if (item.status === 'pending' && item.dueDate && item.dueDate < now) {
          item.status = 'overdue';
          changed = true;
        }
      });
      if (changed) {
        const anyOverdue = prog.items.some(i => i.status === 'overdue' && i.mandatory);
        if (anyOverdue) prog.overallStatus = 'overdue';
        await prog.save();
      }
    }

    res.json({ success: true, data: { progressList } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.markItemComplete = async (req, res) => {
  try {
    const userId   = req.user.userId;
    const { progressId, itemId } = req.params;
    const { notes } = req.body;

    const progress = await EmployeeOnboardingProgress.findOne({ _id: progressId, deletedAt: null });
    if (!progress) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Onboarding progress not found' } });

    // Verify employee owns this progress (or is admin/HR)
    const adminRoles = ['SUPERADMIN', 'ADMIN', 'SUBADMIN', 'DEPT_HEAD'];
    if (!adminRoles.includes(req.user.role)) {
      const emp = await Employee.findOne({ userId, deletedAt: null });
      if (!emp || progress.employeeId.toString() !== emp._id.toString()) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot update another employee\'s onboarding' } });
      }
    }

    const item = progress.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Item not found' } });

    item.status      = 'completed';
    item.completedAt = new Date();
    item.completedBy = userId;
    item.notes       = notes || '';

    // Recompute overall status
    const allDone    = progress.items.every(i => ['completed', 'skipped'].includes(i.status));
    const anyOverdue = progress.items.some(i => i.status === 'overdue' && i.mandatory);
    progress.overallStatus = allDone ? 'completed' : anyOverdue ? 'overdue' : 'in_progress';
    if (allDone) progress.completedAt = new Date();

    await progress.save();
    await logAudit({ userId, action: 'UPDATE', resource: 'employee_onboarding', resourceId: progress._id, req });
    res.json({ success: true, data: { progress } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ─── HR Views ─────────────────────────────────────────────────────────────────

exports.getEmployeeOnboarding = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const progressList = await EmployeeOnboardingProgress.find({ employeeId, deletedAt: null })
      .populate('checklistId', 'name');
    res.json({ success: true, data: { progressList } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

exports.listAllProgress = async (req, res) => {
  try {
    const { status, page = 1, limit = 30 } = req.query;
    const filter = { deletedAt: null };
    if (status) filter.overallStatus = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [progressList, total] = await Promise.all([
      EmployeeOnboardingProgress.find(filter)
        .populate({ path: 'employeeId', select: 'firstName lastName employeeCode', populate: { path: 'userId', select: 'name email' } })
        .populate('checklistId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip).limit(Number(limit)),
      EmployeeOnboardingProgress.countDocuments(filter),
    ]);
    res.json({ success: true, data: { progressList, total, page: Number(page) } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

// ─── Helper — auto-assign default template on employee creation ───────────────

exports.autoAssignDefaultChecklist = async (employeeId, userId) => {
  try {
    const tmpl = await OnboardingChecklist.findOne({ isDefault: true, deletedAt: null });
    if (!tmpl) return;
    const emp   = await Employee.findById(employeeId);
    if (!emp)   return;
    const start = emp.dateOfJoining || new Date();
    const items = buildProgressItems(tmpl.items, start);
    await EmployeeOnboardingProgress.findOneAndUpdate(
      { employeeId, checklistId: tmpl._id },
      { $setOnInsert: { employeeId, checklistId: tmpl._id, checklistName: tmpl.name, startDate: start, items, overallStatus: 'in_progress', createdBy: userId, deletedAt: null } },
      { upsert: true, new: true },
    );
  } catch { /* non-critical, log silently */ }
};
