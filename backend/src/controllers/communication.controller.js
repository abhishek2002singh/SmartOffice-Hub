const Communication = require('../models/Communication');
const AppError      = require('../utils/AppError');
const { z }         = require('zod');

const commSchema = z.object({
  type:      z.enum(['call', 'whatsapp', 'sms', 'email', 'note', 'meeting']),
  direction: z.enum(['in', 'out']).optional(),
  content:   z.string().min(1, 'Content is required').max(5000),
  duration:  z.number().min(0).optional().or(z.null()),
});

// ─── LOG COMMUNICATION (for a lead or client) ─────────────────────────────────
exports.logComm = async (req, res, next) => {
  try {
    const parsed = commSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError('Validation error', 400, 'VALIDATION_ERROR', parsed.error.flatten()));

    const { leadId, clientId } = req.params;
    if (!leadId && !clientId) return next(new AppError('leadId or clientId required', 400, 'VALIDATION_ERROR'));

    const comm = await Communication.create({
      lead:      leadId   || null,
      client:    clientId || null,
      ...parsed.data,
      createdBy: req.user.userId,
    });

    res.status(201).json({ success: true, data: { communication: comm }, message: 'Logged' });
  } catch (err) { next(err); }
};

// ─── LIST COMMUNICATIONS (for a lead) ─────────────────────────────────────────
exports.listLeadComms = async (req, res, next) => {
  try {
    const comms = await Communication.find({ lead: req.params.leadId })
      .sort('-createdAt')
      .populate('createdBy', 'name')
      .lean();
    res.json({ success: true, data: { communications: comms } });
  } catch (err) { next(err); }
};

// ─── LIST COMMUNICATIONS (for a client) ───────────────────────────────────────
exports.listClientComms = async (req, res, next) => {
  try {
    const comms = await Communication.find({ client: req.params.clientId })
      .sort('-createdAt')
      .populate('createdBy', 'name')
      .lean();
    res.json({ success: true, data: { communications: comms } });
  } catch (err) { next(err); }
};

// ─── UNIFIED TIMELINE for a lead (activities + communications merged) ──────────
exports.leadTimeline = async (req, res, next) => {
  try {
    const Activity = require('../models/Activity');
    const [activities, comms] = await Promise.all([
      Activity.find({ lead: req.params.leadId }).populate('createdBy', 'name').lean(),
      Communication.find({ lead: req.params.leadId }).populate('createdBy', 'name').lean(),
    ]);

    const timeline = [
      ...activities.map((a) => ({ ...a, _source: 'activity' })),
      ...comms.map((c)      => ({ ...c, _source: 'communication' })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, data: { timeline } });
  } catch (err) { next(err); }
};
