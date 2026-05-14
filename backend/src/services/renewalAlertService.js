const ServiceSubscription = require('../models/ServiceSubscription');
const Notification        = require('../models/Notification');
const Client              = require('../models/Client');

const ALERT_DAYS = [30, 15, 7];

const checkRenewals = async (io) => {
  const now = new Date();
  let alertCount = 0;

  for (const days of ALERT_DAYS) {
    const from = new Date(now); from.setHours(0, 0, 0, 0);
    const to   = new Date(from); to.setDate(to.getDate() + days + 1);
    const dayStart = new Date(from); dayStart.setDate(dayStart.getDate() + days);

    const dueSubs = await ServiceSubscription.find({
      status:      'active',
      deletedAt:   null,
      renewalDate: { $gte: dayStart, $lt: to },
      alertsSent:  { $ne: days },
    }).populate('service', 'name').lean();

    for (const sub of dueSubs) {
      const client = await Client.findById(sub.client).select('name accountManager').lean();
      if (!client) continue;

      const recipients = new Set();
      if (client.accountManager) recipients.add(client.accountManager.toString());
      if (sub.assignedHead) recipients.add(sub.assignedHead.toString());

      for (const userId of recipients) {
        const notif = await Notification.create({
          recipient: userId,
          type:      'WARNING',
          title:     `Renewal Due in ${days} Days`,
          message:   `${client.name} — ${sub.service?.name} renews on ${new Date(sub.renewalDate).toLocaleDateString('en-IN')}`,
          link:      `/crm/clients/${sub.client}`,
        });
        io?.to(`user:${userId}`).emit('notification', notif.toObject());
      }

      await ServiceSubscription.findByIdAndUpdate(sub._id, { $addToSet: { alertsSent: days } });
      alertCount++;
    }
  }

  if (alertCount) console.log(`[renewal-alerts] ${alertCount} renewal alerts sent`);
};

const startRenewalAlertService = (io) => {
  const INTERVAL = 24 * 60 * 60 * 1000;
  checkRenewals(io).catch((e) => console.error('[renewal-alerts]', e.message));
  setInterval(() => checkRenewals(io).catch((e) => console.error('[renewal-alerts]', e.message)), INTERVAL);
  console.log('[renewal-alerts] Started — checking daily');
};

module.exports = { startRenewalAlertService };
