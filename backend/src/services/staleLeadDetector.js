const Lead         = require('../models/Lead');
const Notification = require('../models/Notification');
const User         = require('../models/User');

const THRESHOLDS = {
  new:         2  * 60 * 60 * 1000,
  contacted:   48 * 60 * 60 * 1000,
  qualified:   5  * 24 * 60 * 60 * 1000,
  proposal:    7  * 24 * 60 * 60 * 1000,
  negotiation: 3  * 24 * 60 * 60 * 1000,
};

const hrLabel = (ms) => {
  const h = ms / 3600000;
  return h >= 24 ? `${Math.round(h / 24)} days` : `${Math.round(h)} hrs`;
};

const getSalesHeads = async () =>
  User.find({ role: { $in: ['ADMIN', 'SUPERADMIN', 'DEPT_HEAD'] }, deletedAt: null })
    .select('_id')
    .lean();

const detectStaleLeads = async (io) => {
  const now = new Date();

  for (const [stage, threshold] of Object.entries(THRESHOLDS)) {
    const cutoff = new Date(now - threshold);

    const staleLeads = await Lead.find({
      stage,
      deletedAt: null,
      updatedAt: { $lt: cutoff },
    }).select('_id name assignedTo').lean();

    if (!staleLeads.length) continue;

    const salesHeads = await getSalesHeads();

    for (const lead of staleLeads) {
      const recipients = new Set(salesHeads.map((h) => h._id.toString()));
      if (lead.assignedTo) recipients.add(lead.assignedTo.toString());

      for (const userId of recipients) {
        const notif = await Notification.create({
          recipient: userId,
          type:      'WARNING',
          title:     'Stale Lead Alert',
          message:   `"${lead.name}" has been in "${stage}" stage for over ${hrLabel(threshold)}`,
          link:      `/crm/leads/${lead._id}`,
        });

        io?.to(`user:${userId}`).emit('notification', notif.toObject());
      }
    }

    console.log(`[stale-detector] ${staleLeads.length} stale in "${stage}"`);
  }
};

const startStaleLeadDetector = (io) => {
  const INTERVAL = 30 * 60 * 1000;
  setInterval(() => detectStaleLeads(io).catch((e) => console.error('[stale-detector]', e.message)), INTERVAL);
  console.log('[stale-detector] Started — checking every 30 min');
};

module.exports = { startStaleLeadDetector };
