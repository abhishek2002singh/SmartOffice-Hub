const AuditLog = require('../models/AuditLog');

const list = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.action)   filter.action   = req.query.action;
    if (req.query.resource) filter.resource = req.query.resource;
    if (req.query.userId)   filter.userId   = req.query.userId;

    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to)   filter.createdAt.$lte = new Date(req.query.to);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('userId', 'name email')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ success: true, data: { logs, total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const log = await AuditLog.findById(req.params.id).populate('userId', 'name email').lean();
    if (!log) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Log not found' } });
    res.json({ success: true, data: { log } });
  } catch (err) { next(err); }
};

module.exports = { list, getOne };
