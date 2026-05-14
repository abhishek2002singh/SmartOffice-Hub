const LeadSource = require('../models/LeadSource');

const MASTER_SOURCES = [
  { name: 'Website',               code: 'WEBSITE' },
  { name: 'Google Ads',            code: 'GOOGLE_ADS' },
  { name: 'Meta Ads',              code: 'META_ADS' },
  { name: 'LinkedIn',              code: 'LINKEDIN' },
  { name: 'GMB Ank Digital Media', code: 'GMB_ADM' },
  { name: 'GMB Ank Development',   code: 'GMB_DEV' },
  { name: 'GMB ANK SMS',           code: 'GMB_SMS' },
  { name: 'WhatsApp',              code: 'WHATSAPP' },
  { name: 'IVR',                   code: 'IVR' },
  { name: 'Email',                 code: 'EMAIL' },
  { name: 'Manual',                code: 'MANUAL' },
  { name: 'Bulk Import',           code: 'BULK_IMPORT' },
  { name: 'Referral',              code: 'REFERRAL' },
];

const seedLeadSources = async () => {
  for (const src of MASTER_SOURCES) {
    await LeadSource.findOneAndUpdate({ code: src.code }, src, { upsert: true, new: true });
  }
  console.log(`[seed] ${MASTER_SOURCES.length} lead sources seeded`);
};

module.exports = { seedLeadSources };
