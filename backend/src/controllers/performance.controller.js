const mongoose = require('mongoose');
const KRA               = require('../models/KRA');
const PerformanceCycle  = require('../models/PerformanceCycle');
const Goal              = require('../models/Goal');
const SelfEvaluation    = require('../models/SelfEvaluation');
const ManagerEvaluation = require('../models/ManagerEvaluation');
const PeerFeedback      = require('../models/PeerFeedback');
const OneOnOne          = require('../models/OneOnOne');
const PIP               = require('../models/PIP');
const Employee          = require('../models/Employee');
const { logAudit }      = require('../middleware/auditLogger');

// ─── KRA ─────────────────────────────────────────────────────────────────────

exports.createKRA = async (req, res, next) => {
  try {
    const { name, description = '', applicableRoles = [], measurableUnits = '', weightagePercent = 0 } = req.body;
    if (!name) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'name required' } });
    const kra = await KRA.create({ name, description, applicableRoles, measurableUnits, weightagePercent, createdBy: req.user.userId });
    await logAudit(req, 'CREATE', 'kra', kra._id, null, kra.toObject());
    res.status(201).json({ success: true, data: { kra } });
  } catch (err) { next(err); }
};

exports.listKRAs = async (req, res, next) => {
  try {
    const filter = { deletedAt: null };
    if (req.query.role) filter.applicableRoles = req.query.role;
    const kras = await KRA.find(filter).sort({ name: 1 });
    res.json({ success: true, data: { kras } });
  } catch (err) { next(err); }
};

exports.updateKRA = async (req, res, next) => {
  try {
    const before = await KRA.findOne({ _id: req.params.id, deletedAt: null });
    if (!before) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'KRA not found' } });
    const { name, description, applicableRoles, measurableUnits, weightagePercent, isActive } = req.body;
    const updates = { updatedBy: req.user.userId };
    if (name != null)             updates.name             = name;
    if (description != null)      updates.description      = description;
    if (applicableRoles != null)  updates.applicableRoles  = applicableRoles;
    if (measurableUnits != null)  updates.measurableUnits  = measurableUnits;
    if (weightagePercent != null) updates.weightagePercent = weightagePercent;
    if (isActive != null)         updates.isActive         = isActive;
    const kra = await KRA.findByIdAndUpdate(req.params.id, updates, { new: true });
    await logAudit(req, 'UPDATE', 'kra', kra._id, before.toObject(), kra.toObject());
    res.json({ success: true, data: { kra } });
  } catch (err) { next(err); }
};

exports.deleteKRA = async (req, res, next) => {
  try {
    const kra = await KRA.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date(), updatedBy: req.user.userId },
      { new: true },
    );
    if (!kra) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'KRA not found' } });
    await logAudit(req, 'DELETE', 'kra', kra._id, null, null);
    res.json({ success: true, message: 'KRA deleted' });
  } catch (err) { next(err); }
};

// ─── Performance Cycles ───────────────────────────────────────────────────────

exports.createCycle = async (req, res, next) => {
  try {
    const { name, type, startDate, endDate } = req.body;
    if (!name || !type || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'name, type, startDate, endDate required' } });
    }
    const cycle = await PerformanceCycle.create({ name, type, startDate, endDate, status: 'planned', createdBy: req.user.userId });
    await logAudit(req, 'CREATE', 'performance_cycle', cycle._id, null, cycle.toObject());
    res.status(201).json({ success: true, data: { cycle } });
  } catch (err) { next(err); }
};

exports.listCycles = async (req, res, next) => {
  try {
    const filter = { deletedAt: null };
    if (req.query.status) filter.status = req.query.status;
    const cycles = await PerformanceCycle.find(filter).sort({ startDate: -1 });
    res.json({ success: true, data: { cycles } });
  } catch (err) { next(err); }
};

exports.getCycle = async (req, res, next) => {
  try {
    const cycle = await PerformanceCycle.findOne({ _id: req.params.id, deletedAt: null });
    if (!cycle) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Cycle not found' } });
    res.json({ success: true, data: { cycle } });
  } catch (err) { next(err); }
};

exports.updateCycle = async (req, res, next) => {
  try {
    const before = await PerformanceCycle.findOne({ _id: req.params.id, deletedAt: null });
    if (!before) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Cycle not found' } });
    const { name, type, startDate, endDate, status } = req.body;
    const updates = { updatedBy: req.user.userId };
    if (name != null)      updates.name      = name;
    if (type != null)      updates.type      = type;
    if (startDate != null) updates.startDate = startDate;
    if (endDate != null)   updates.endDate   = endDate;
    if (status != null)    updates.status    = status;
    const cycle = await PerformanceCycle.findByIdAndUpdate(req.params.id, updates, { new: true });
    await logAudit(req, 'UPDATE', 'performance_cycle', cycle._id, before.toObject(), cycle.toObject());
    res.json({ success: true, data: { cycle } });
  } catch (err) { next(err); }
};

// ─── Goals ────────────────────────────────────────────────────────────────────

exports.setGoals = async (req, res, next) => {
  try {
    const { id: employeeId } = req.params;
    const { cycleId, goals: goalList } = req.body;
    if (!cycleId || !Array.isArray(goalList)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'cycleId and goals[] required' } });
    }

    const isManager = ['ADMIN', 'SUPERADMIN', 'DEPT_HEAD'].includes(req.user.role);
    const created = [];
    for (const g of goalList) {
      const goal = await Goal.create({
        employeeId, cycleId,
        kraId:            g.kraId || null,
        title:            g.title,
        description:      g.description || '',
        targetValue:      g.targetValue || '',
        weightagePercent: g.weightagePercent || 0,
        setByManager:     isManager,
        status:           'set',
        createdBy:        req.user.userId,
      });
      created.push(goal);
    }
    res.status(201).json({ success: true, data: { goals: created } });
  } catch (err) { next(err); }
};

exports.listGoals = async (req, res, next) => {
  try {
    const { id: employeeId } = req.params;
    const { cycleId } = req.query;
    const filter = { employeeId, deletedAt: null };
    if (cycleId) filter.cycleId = cycleId;
    const goals = await Goal.find(filter).populate('kraId', 'name measurableUnits').sort({ createdAt: 1 });
    res.json({ success: true, data: { goals } });
  } catch (err) { next(err); }
};

exports.updateGoal = async (req, res, next) => {
  try {
    const before = await Goal.findOne({ _id: req.params.goalId, deletedAt: null });
    if (!before) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Goal not found' } });
    const { title, description, targetValue, achievedValue, weightagePercent, status } = req.body;
    const updates = { updatedBy: req.user.userId };
    if (title != null)            updates.title            = title;
    if (description != null)      updates.description      = description;
    if (targetValue != null)      updates.targetValue      = targetValue;
    if (achievedValue != null)    updates.achievedValue    = achievedValue;
    if (weightagePercent != null) updates.weightagePercent = weightagePercent;
    if (status != null)           updates.status           = status;
    const goal = await Goal.findByIdAndUpdate(req.params.goalId, updates, { new: true });
    await logAudit(req, 'UPDATE', 'goal', goal._id, before.toObject(), goal.toObject());
    res.json({ success: true, data: { goal } });
  } catch (err) { next(err); }
};

exports.deleteGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.goalId, deletedAt: null },
      { deletedAt: new Date(), updatedBy: req.user.userId },
      { new: true },
    );
    if (!goal) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Goal not found' } });
    res.json({ success: true, message: 'Goal deleted' });
  } catch (err) { next(err); }
};

// ─── Self Evaluation ──────────────────────────────────────────────────────────

exports.saveSelfEvaluation = async (req, res, next) => {
  try {
    const { cycleId } = req.params;
    const { goalRatings = [], strengths = '', improvements = '', trainingNeeds = '', submit = false } = req.body;

    const emp = await Employee.findOne({ userId: req.user.userId, deletedAt: null });
    if (!emp) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee profile not found' } });

    const updates = {
      goalRatings, strengths, improvements, trainingNeeds,
      updatedBy: req.user.userId,
    };
    if (submit) updates.submittedAt = new Date();

    const eval_ = await SelfEvaluation.findOneAndUpdate(
      { employeeId: emp._id, cycleId },
      { $set: updates, $setOnInsert: { createdBy: req.user.userId } },
      { new: true, upsert: true },
    );
    res.json({ success: true, data: { evaluation: eval_ } });
  } catch (err) { next(err); }
};

exports.getMySelfEvaluation = async (req, res, next) => {
  try {
    const { cycleId } = req.params;
    const emp = await Employee.findOne({ userId: req.user.userId, deletedAt: null });
    if (!emp) return res.json({ success: true, data: { evaluation: null } });

    const eval_ = await SelfEvaluation.findOne({ employeeId: emp._id, cycleId })
      .populate('goalRatings.goalId', 'title targetValue weightagePercent');
    res.json({ success: true, data: { evaluation: eval_ } });
  } catch (err) { next(err); }
};

// ─── Manager Evaluation ───────────────────────────────────────────────────────

exports.saveManagerEvaluation = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const { cycleId, goalRatings = [], overallRating, strengths = '', improvements = '',
            incrementRecommendation = 0, promotionRecommendation = false, submit = false } = req.body;

    if (!cycleId || !overallRating) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'cycleId, overallRating required' } });
    }

    const updates = {
      managerId: req.user.userId,
      goalRatings, overallRating, strengths, improvements,
      incrementRecommendation, promotionRecommendation,
      updatedBy: req.user.userId,
    };
    if (submit) updates.submittedAt = new Date();

    const eval_ = await ManagerEvaluation.findOneAndUpdate(
      { employeeId, cycleId },
      { $set: updates, $setOnInsert: { createdBy: req.user.userId } },
      { new: true, upsert: true },
    );
    await logAudit(req, 'UPDATE', 'manager_evaluation', eval_._id, null, eval_.toObject());
    res.json({ success: true, data: { evaluation: eval_ } });
  } catch (err) { next(err); }
};

exports.getManagerEvaluation = async (req, res, next) => {
  try {
    const { employeeId, cycleId } = req.params;
    const eval_ = await ManagerEvaluation.findOne({ employeeId, cycleId })
      .populate('goalRatings.goalId', 'title targetValue weightagePercent')
      .populate('managerId', 'name');
    res.json({ success: true, data: { evaluation: eval_ } });
  } catch (err) { next(err); }
};

// Get combined view: self + manager + goals for a cycle
exports.getPerformanceView = async (req, res, next) => {
  try {
    const { employeeId, cycleId } = req.params;

    // Access guard: admin/manager can see all, employee can only see own
    const isAdmin = ['ADMIN', 'SUPERADMIN', 'DEPT_HEAD'].includes(req.user.role);
    if (!isAdmin) {
      const emp = await Employee.findOne({ userId: req.user.userId, deletedAt: null });
      if (!emp || emp._id.toString() !== employeeId) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
      }
    }

    const [goals, selfEval, managerEval, peerFeedbacks] = await Promise.all([
      Goal.find({ employeeId, cycleId, deletedAt: null }).populate('kraId', 'name'),
      SelfEvaluation.findOne({ employeeId, cycleId }),
      ManagerEvaluation.findOne({ employeeId, cycleId }).populate('managerId', 'name'),
      PeerFeedback.find({ evaluateeId: employeeId, cycleId }),
    ]);

    // Aggregate peer feedback (hide evaluator identities)
    const peerSummary = peerFeedbacks.length > 0 ? {
      count: peerFeedbacks.length,
      avgTeamwork:      avg(peerFeedbacks.map(p => p.ratings?.teamwork).filter(Boolean)),
      avgCommunication: avg(peerFeedbacks.map(p => p.ratings?.communication).filter(Boolean)),
      avgReliability:   avg(peerFeedbacks.map(p => p.ratings?.reliability).filter(Boolean)),
      avgInnovation:    avg(peerFeedbacks.map(p => p.ratings?.innovation).filter(Boolean)),
      avgLeadership:    avg(peerFeedbacks.map(p => p.ratings?.leadership).filter(Boolean)),
    } : null;

    res.json({ success: true, data: { goals, selfEval, managerEval, peerSummary } });
  } catch (err) { next(err); }
};

function avg(arr) {
  if (!arr.length) return null;
  return Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10;
}

// ─── Peer Feedback ────────────────────────────────────────────────────────────

exports.submitPeerFeedback = async (req, res, next) => {
  try {
    const { evaluateeId, cycleId, ratings = {}, comments = '', anonymous = true } = req.body;
    if (!evaluateeId || !cycleId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'evaluateeId, cycleId required' } });
    }

    const evaluatorEmp = await Employee.findOne({ userId: req.user.userId, deletedAt: null });
    if (!evaluatorEmp) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Your employee profile not found' } });
    if (evaluatorEmp._id.toString() === evaluateeId) {
      return res.status(400).json({ success: false, error: { code: 'SELF_FEEDBACK', message: 'Cannot submit feedback for yourself' } });
    }

    const fb = await PeerFeedback.findOneAndUpdate(
      { evaluateeId, evaluatorId: evaluatorEmp._id, cycleId },
      { $set: { ratings, comments, anonymous, submittedAt: new Date(), createdBy: req.user.userId } },
      { new: true, upsert: true },
    );
    res.status(201).json({ success: true, data: { feedback: fb } });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Feedback already submitted for this cycle' } });
    next(err);
  }
};

exports.listPeerFeedback = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const { cycleId } = req.query;
    const filter = { evaluateeId: employeeId };
    if (cycleId) filter.cycleId = cycleId;

    const feedbacks = await PeerFeedback.find(filter);
    // Return anonymized or full based on role
    const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(req.user.role);
    const result = feedbacks.map(fb => {
      const obj = fb.toObject();
      if (fb.anonymous && !isAdmin) delete obj.evaluatorId;
      return obj;
    });
    res.json({ success: true, data: { feedbacks: result } });
  } catch (err) { next(err); }
};

// ─── 1-on-1 Meetings ─────────────────────────────────────────────────────────

exports.createOneOnOne = async (req, res, next) => {
  try {
    const { employeeId, scheduledAt, agenda = '' } = req.body;
    if (!employeeId || !scheduledAt) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'employeeId, scheduledAt required' } });
    }
    const meeting = await OneOnOne.create({
      managerId: req.user.userId, employeeId, scheduledAt, agenda,
      status: 'scheduled', createdBy: req.user.userId,
    });
    res.status(201).json({ success: true, data: { meeting } });
  } catch (err) { next(err); }
};

exports.listOneOnOnes = async (req, res, next) => {
  try {
    const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(req.user.role);
    let filter = {};

    if (isAdmin) {
      // Admin sees all — optionally filter by employeeId
      if (req.query.employeeId) filter.employeeId = req.query.employeeId;
    } else {
      // Manager sees their own meetings; employee sees theirs
      const emp = await Employee.findOne({ userId: req.user.userId, deletedAt: null });
      filter = {
        $or: [
          { managerId: req.user.userId },
          { employeeId: emp?._id },
        ],
      };
    }
    if (req.query.status) filter.status = req.query.status;

    const meetings = await OneOnOne.find(filter)
      .populate({ path: 'employeeId', select: 'firstName lastName employeeCode' })
      .populate('managerId', 'name')
      .sort({ scheduledAt: -1 })
      .limit(50);
    res.json({ success: true, data: { meetings } });
  } catch (err) { next(err); }
};

exports.updateOneOnOne = async (req, res, next) => {
  try {
    const before = await OneOnOne.findById(req.params.id);
    if (!before) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Meeting not found' } });

    const { agenda, notes, actionItems, status, conductedAt } = req.body;
    const updates = { updatedBy: req.user.userId };
    if (agenda != null)      updates.agenda      = agenda;
    if (notes != null)       updates.notes       = notes;
    if (actionItems != null) updates.actionItems = actionItems;
    if (status != null)      updates.status      = status;
    if (conductedAt != null) updates.conductedAt = conductedAt;

    const meeting = await OneOnOne.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate({ path: 'employeeId', select: 'firstName lastName employeeCode' });
    await logAudit(req, 'UPDATE', 'one_on_one', meeting._id, before.toObject(), meeting.toObject());
    res.json({ success: true, data: { meeting } });
  } catch (err) { next(err); }
};

// ─── PIP ──────────────────────────────────────────────────────────────────────

exports.createPIP = async (req, res, next) => {
  try {
    const { employeeId, startDate, endDate, reason, expectations = [] } = req.body;
    if (!employeeId || !startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'employeeId, startDate, endDate, reason required' } });
    }
    // Only one active PIP per employee
    const existing = await PIP.findOne({ employeeId, status: 'active', deletedAt: null });
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'ACTIVE_PIP_EXISTS', message: 'Employee already has an active PIP' } });
    }
    const pip = await PIP.create({
      employeeId, startDate, endDate, reason, expectations,
      reviewerId: req.user.userId,
      status: 'active',
      createdBy: req.user.userId,
    });
    await logAudit(req, 'CREATE', 'pip', pip._id, null, pip.toObject());
    res.status(201).json({ success: true, data: { pip } });
  } catch (err) { next(err); }
};

exports.listPIPs = async (req, res, next) => {
  try {
    const filter = { deletedAt: null };
    if (req.query.employeeId) filter.employeeId = req.query.employeeId;
    if (req.query.status)     filter.status     = req.query.status;
    const pips = await PIP.find(filter)
      .populate({ path: 'employeeId', select: 'firstName lastName employeeCode' })
      .populate('reviewerId', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: { pips } });
  } catch (err) { next(err); }
};

exports.getPIP = async (req, res, next) => {
  try {
    const pip = await PIP.findOne({ _id: req.params.id, deletedAt: null })
      .populate({ path: 'employeeId', select: 'firstName lastName employeeCode' })
      .populate('reviewerId', 'name')
      .populate('reviews.reviewedBy', 'name');
    if (!pip) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'PIP not found' } });
    res.json({ success: true, data: { pip } });
  } catch (err) { next(err); }
};

exports.addPIPReview = async (req, res, next) => {
  try {
    const { notes = '', progressRating } = req.body;
    if (!progressRating) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'progressRating required' } });
    }
    const pip = await PIP.findOne({ _id: req.params.id, status: 'active', deletedAt: null });
    if (!pip) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Active PIP not found' } });

    pip.reviews.push({ reviewedAt: new Date(), reviewedBy: req.user.userId, notes, progressRating });
    pip.updatedBy = req.user.userId;
    await pip.save();
    await logAudit(req, 'UPDATE', 'pip', pip._id, null, pip.toObject());
    res.json({ success: true, data: { pip } });
  } catch (err) { next(err); }
};

exports.closePIP = async (req, res, next) => {
  try {
    const { status, closingNotes = '' } = req.body;
    if (!['passed', 'failed', 'withdrawn'].includes(status)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'status must be passed, failed, or withdrawn' } });
    }
    const pip = await PIP.findOne({ _id: req.params.id, status: 'active', deletedAt: null });
    if (!pip) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Active PIP not found' } });

    pip.status       = status;
    pip.closedAt     = new Date();
    pip.closedBy     = req.user.userId;
    pip.closingNotes = closingNotes;
    pip.updatedBy    = req.user.userId;
    await pip.save();
    await logAudit(req, 'UPDATE', 'pip', pip._id, null, pip.toObject());
    res.json({ success: true, data: { pip } });
  } catch (err) { next(err); }
};

// ─── Performance Reports ──────────────────────────────────────────────────────

exports.getPerformanceReport = async (req, res, next) => {
  try {
    const { cycleId } = req.query;
    if (!cycleId) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'cycleId required' } });

    // All manager evaluations for this cycle
    const evals = await ManagerEvaluation.find({ cycleId })
      .populate({ path: 'employeeId', select: 'firstName lastName employeeCode departmentId', populate: { path: 'departmentId', select: 'name' } })
      .lean();

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    evals.forEach(e => {
      const r = Math.round(e.overallRating);
      if (r >= 1 && r <= 5) distribution[r]++;
    });

    const avgRating = evals.length
      ? Math.round(evals.reduce((s, e) => s + e.overallRating, 0) / evals.length * 10) / 10
      : 0;

    const promotions = evals.filter(e => e.promotionRecommendation).length;
    const selfEvalCount = await SelfEvaluation.countDocuments({ cycleId, submittedAt: { $ne: null } });

    res.json({
      success: true,
      data: {
        cycleId,
        totalEvaluated: evals.length,
        selfEvalSubmitted: selfEvalCount,
        avgRating,
        distribution,
        promotionRecommendations: promotions,
        topPerformers: evals.filter(e => e.overallRating >= 4).map(e => ({
          employeeId: e.employeeId?._id,
          name:       `${e.employeeId?.firstName} ${e.employeeId?.lastName}`,
          code:       e.employeeId?.employeeCode,
          dept:       e.employeeId?.departmentId?.name,
          rating:     e.overallRating,
          promotion:  e.promotionRecommendation,
          increment:  e.incrementRecommendation,
        })),
      },
    });
  } catch (err) { next(err); }
};

// Employee's own performance history across cycles
exports.getMyPerformanceHistory = async (req, res, next) => {
  try {
    const emp = await Employee.findOne({ userId: req.user.userId, deletedAt: null });
    if (!emp) return res.json({ success: true, data: { history: [] } });

    const evals = await ManagerEvaluation.find({ employeeId: emp._id })
      .populate('cycleId', 'name type startDate endDate')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { history: evals } });
  } catch (err) { next(err); }
};
