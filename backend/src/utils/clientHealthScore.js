const ServiceSubscription = require('../models/ServiceSubscription');
const ServiceTicket       = require('../models/ServiceTicket');

const calcHealthScore = async (clientId) => {
  const now = new Date();
  const d30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [activeSubs, overdueRenewals, openEscalations] = await Promise.all([
    ServiceSubscription.countDocuments({ client: clientId, status: 'active', deletedAt: null }),
    ServiceSubscription.countDocuments({ client: clientId, status: 'active', renewalDate: { $lt: now }, deletedAt: null }),
    ServiceTicket.countDocuments({ client: clientId, status: { $in: ['open', 'in_progress'] }, priority: 'urgent', deletedAt: null }),
  ]);

  const renewingDueSoon = await ServiceSubscription.countDocuments({
    client: clientId, status: 'active', renewalDate: { $gte: now, $lte: d30 }, deletedAt: null,
  });

  if (overdueRenewals > 0 || openEscalations > 0 || activeSubs === 0) return 'red';
  if (renewingDueSoon > 0) return 'yellow';
  return 'green';
};

module.exports = { calcHealthScore };
