const ServiceCatalog = require('../models/ServiceCatalog');

const ANK_SERVICES = [
  { name: 'Web Development',          code: 'WEB_DEV',       category: 'web' },
  { name: 'SEO',                       code: 'SEO',           category: 'digital_marketing' },
  { name: 'Social Media Management',  code: 'SMM',           category: 'digital_marketing' },
  { name: 'Meta Ads',                  code: 'META_ADS',      category: 'advertising' },
  { name: 'Google Ads',                code: 'GOOGLE_ADS',   category: 'advertising' },
  { name: 'LinkedIn Ads',              code: 'LINKEDIN_ADS', category: 'advertising' },
  { name: 'Pinterest Ads',             code: 'PINTEREST_ADS',category: 'advertising' },
  { name: 'Twitter/X Ads',             code: 'TWITTER_ADS',  category: 'advertising' },
  { name: 'WhatsApp Marketing',        code: 'WHATSAPP',     category: 'messaging' },
  { name: 'Bulk SMS',                  code: 'BULK_SMS',     category: 'messaging' },
  { name: 'RCS Messaging',             code: 'RCS',          category: 'messaging' },
  { name: 'OTP Services',              code: 'OTP',          category: 'messaging' },
  { name: 'IVR Services',              code: 'IVR',          category: 'messaging' },
  { name: 'Miss Call Services',        code: 'MISS_CALL',    category: 'messaging' },
  { name: 'Lead Generation',           code: 'LEAD_GEN',     category: 'digital_marketing' },
  { name: 'Email Marketing',           code: 'EMAIL_MKT',    category: 'digital_marketing' },
];

const seedServiceCatalog = async () => {
  for (const svc of ANK_SERVICES) {
    await ServiceCatalog.findOneAndUpdate({ code: svc.code }, svc, { upsert: true, new: true });
  }
  console.log(`[seed] ${ANK_SERVICES.length} services seeded`);
};

module.exports = { seedServiceCatalog };
