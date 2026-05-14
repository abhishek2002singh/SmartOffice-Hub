const Lead                = require('../models/Lead');
const Client              = require('../models/Client');
const ServiceSubscription = require('../models/ServiceSubscription');
const User                = require('../models/User');
const { getLeadHeat }     = require('../utils/leadScoring');

// ─── PIPELINE VALUE ───────────────────────────────────────────────────────────
exports.pipelineValue = async (_req, res, next) => {
  try {
    const data = await Lead.aggregate([
      { $match: { deletedAt: null, stage: { $nin: ['lost', 'junk'] } } },
      { $group: { _id: '$stage', count: { $sum: 1 }, totalValue: { $sum: '$value' } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ success: true, data: { pipeline: data } });
  } catch (err) { next(err); }
};

// ─── CONVERSION FUNNEL ────────────────────────────────────────────────────────
exports.conversionFunnel = async (_req, res, next) => {
  try {
    const STAGES = ['new', 'assigned', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
    const counts = await Lead.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: '$stage', count: { $sum: 1 } } },
    ]);
    const map = Object.fromEntries(counts.map((c) => [c._id, c.count]));
    const total = counts.reduce((s, c) => s + c.count, 0);
    const funnel = STAGES.map((stage) => ({
      stage,
      count: map[stage] || 0,
      pct: total ? Math.round(((map[stage] || 0) / total) * 100) : 0,
    }));
    res.json({ success: true, data: { funnel, total } });
  } catch (err) { next(err); }
};

// ─── SOURCE QUALITY ───────────────────────────────────────────────────────────
exports.sourceQuality = async (_req, res, next) => {
  try {
    const data = await Lead.aggregate([
      { $match: { deletedAt: null } },
      { $group: {
        _id:   '$source',
        total: { $sum: 1 },
        won:   { $sum: { $cond: [{ $eq: ['$stage', 'won'] }, 1, 0] } },
        lost:  { $sum: { $cond: [{ $eq: ['$stage', 'lost'] }, 1, 0] } },
      }},
      { $lookup: { from: 'leadsources', localField: '_id', foreignField: '_id', as: 'src' } },
      { $project: {
        source: { $arrayElemAt: ['$src.name', 0] },
        total: 1, won: 1, lost: 1,
        winRate: { $cond: ['$total', { $multiply: [{ $divide: ['$won', '$total'] }, 100] }, 0] },
      }},
      { $sort: { total: -1 } },
    ]);
    res.json({ success: true, data: { sources: data } });
  } catch (err) { next(err); }
};

// ─── BDE PERFORMANCE ──────────────────────────────────────────────────────────
exports.bdePerformance = async (_req, res, next) => {
  try {
    const data = await Lead.aggregate([
      { $match: { deletedAt: null, assignedTo: { $ne: null } } },
      { $group: {
        _id:    '$assignedTo',
        total:  { $sum: 1 },
        won:    { $sum: { $cond: [{ $eq: ['$stage', 'won'] },       1, 0] } },
        lost:   { $sum: { $cond: [{ $eq: ['$stage', 'lost'] },      1, 0] } },
        active: { $sum: { $cond: [{ $not: { $in: ['$stage', ['won','lost','junk']] } }, 1, 0] } },
      }},
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $project: {
        name: { $arrayElemAt: ['$user.name', 0] },
        total: 1, won: 1, lost: 1, active: 1,
        winRate: { $cond: ['$total', { $multiply: [{ $divide: ['$won', '$total'] }, 100] }, 0] },
      }},
      { $sort: { won: -1 } },
    ]);
    res.json({ success: true, data: { bdes: data } });
  } catch (err) { next(err); }
};

// ─── WIN / LOSS REASONS ───────────────────────────────────────────────────────
exports.winLossReasons = async (_req, res, next) => {
  try {
    const [lostReasons, wonCount] = await Promise.all([
      Lead.aggregate([
        { $match: { deletedAt: null, stage: 'lost', lostReason: { $ne: null, $ne: '' } } },
        { $group: { _id: '$lostReason', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Lead.countDocuments({ deletedAt: null, stage: 'won' }),
    ]);
    res.json({ success: true, data: { lostReasons, wonCount } });
  } catch (err) { next(err); }
};

// ─── DASHBOARD SUMMARY ────────────────────────────────────────────────────────
exports.dashboardSummary = async (_req, res, next) => {
  try {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const week  = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const d30   = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      leadsToday, leadsThisWeek,
      totalLeads, wonLeads, activeClients,
      stageBreakdown, topSources,
      renewalsDue30, staleNew, staleContacted,
    ] = await Promise.all([
      Lead.countDocuments({ deletedAt: null, createdAt: { $gte: today } }),
      Lead.countDocuments({ deletedAt: null, createdAt: { $gte: week } }),
      Lead.countDocuments({ deletedAt: null }),
      Lead.countDocuments({ deletedAt: null, stage: 'won' }),
      Client.countDocuments({ deletedAt: null }),
      Lead.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: '$stage', count: { $sum: 1 } } },
      ]),
      Lead.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $lookup: { from: 'leadsources', localField: '_id', foreignField: '_id', as: 'src' } },
        { $project: { name: { $arrayElemAt: ['$src.name', 0] }, count: 1 } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      ServiceSubscription.countDocuments({ status: 'active', deletedAt: null, renewalDate: { $gte: now, $lte: d30 } }),
      Lead.countDocuments({ deletedAt: null, stage: 'new', updatedAt: { $lt: new Date(now - 2 * 3600000) } }),
      Lead.countDocuments({ deletedAt: null, stage: 'contacted', updatedAt: { $lt: new Date(now - 48 * 3600000) } }),
    ]);

    const staleAlerts = staleNew + staleContacted;
    const conversionRate = totalLeads ? Math.round((wonLeads / totalLeads) * 100) : 0;

    res.json({
      success: true,
      data: {
        leadsToday, leadsThisWeek, totalLeads, wonLeads,
        activeClients, conversionRate, staleAlerts, renewalsDue30,
        stageBreakdown, topSources,
      },
    });
  } catch (err) { next(err); }
};

// ─── CSV EXPORT (leads) ───────────────────────────────────────────────────────
exports.exportLeads = async (req, res, next) => {
  try {
    const filter = { deletedAt: null };
    if (req.query.stage)  filter.stage = req.query.stage;
    if (req.query.source) filter.source = req.query.source;

    const leads = await Lead.find(filter)
      .sort('-createdAt')
      .populate('source', 'name')
      .populate('assignedTo', 'name')
      .limit(5000)
      .lean();

    const headers = ['Name', 'Mobile', 'Email', 'Company', 'City', 'Source', 'Stage', 'Priority', 'Score', 'Assigned To', 'Created At'];
    const rows = leads.map((l) => [
      l.name, l.mobile, l.email || '', l.company || '', l.city || '',
      l.source?.name || '', l.stage, l.priority, l.leadScore || 0,
      l.assignedTo?.name || '', new Date(l.createdAt).toLocaleDateString('en-IN'),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads_export.csv"');
    res.send(csv);
  } catch (err) { next(err); }
};

// ─── CSV EXPORT (clients) ─────────────────────────────────────────────────────
exports.exportClients = async (req, res, next) => {
  try {
    const clients = await Client.find({ deletedAt: null })
      .sort('-createdAt')
      .populate('accountManager', 'name')
      .limit(5000)
      .lean();

    const headers = ['Name', 'Company', 'Mobile', 'Email', 'Industry', 'Health', 'Account Manager', 'Onboarded'];
    const rows = clients.map((c) => [
      c.name, c.companyName || '', c.mobile || '', c.email || '',
      c.industry || '', c.healthScore,
      c.accountManager?.name || '', new Date(c.onboardingDate).toLocaleDateString('en-IN'),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="clients_export.csv"');
    res.send(csv);
  } catch (err) { next(err); }
};
