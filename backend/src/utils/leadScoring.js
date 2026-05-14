const SCORE_RULES = [
  (l) => (l.email && l.email !== '')    ? 10 : 0,  // has email
  (l) => l.company                      ? 8  : 0,  // has company
  (l) => l.designation                  ? 5  : 0,  // has designation
  (l) => l.city                         ? 3  : 0,  // has city
  (l) => (l.serviceInterest?.length > 0)? 10 : 0,  // has service interest
  (l) => {                                          // budget tier
    if (!l.budget || l.budget === 0) return 0;
    if (l.budget >= 500000) return 20;
    if (l.budget >= 100000) return 15;
    if (l.budget >= 10000)  return 8;
    return 3;
  },
  (l) => ({ high: 15, medium: 10, low: 5 }[l.priority] || 5),  // priority
  (l) => l.nextFollowUp                 ? 10 : 0,  // has follow-up
  (l) => l.description                  ? 5  : 0,  // has description
  (l) => ({                                         // stage progression bonus
    contacted: 5, qualified: 10, proposal: 15, negotiation: 20,
  }[l.stage] || 0),
];

const calculateLeadScore = (lead) => {
  const raw = SCORE_RULES.reduce((sum, fn) => sum + fn(lead), 0);
  return Math.min(100, raw);
};

const getLeadHeat = (score) => {
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
};

module.exports = { calculateLeadScore, getLeadHeat };
