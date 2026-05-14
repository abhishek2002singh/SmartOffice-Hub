const mongoose = require('mongoose');
const DMPlatform  = require('../models/DMPlatform');
const DMDailyTask = require('../models/DMDailyTask');

const PLATFORMS = [
  { name: 'GMB',                  code: 'GMB',                  sortOrder: 1 },
  { name: 'Facebook',             code: 'FACEBOOK',             sortOrder: 2 },
  { name: 'Instagram',            code: 'INSTAGRAM',            sortOrder: 3 },
  { name: 'Twitter/X',            code: 'TWITTER',              sortOrder: 4 },
  { name: 'LinkedIn',             code: 'LINKEDIN',             sortOrder: 5 },
  { name: 'YouTube',              code: 'YOUTUBE',              sortOrder: 6 },
  { name: 'Meta Ads',             code: 'META_ADS',             sortOrder: 7 },
  { name: 'Google Ads',           code: 'GOOGLE_ADS',           sortOrder: 8 },
  { name: 'LinkedIn Ads',         code: 'LINKEDIN_ADS',         sortOrder: 9 },
  { name: 'E-commerce',           code: 'ECOMMERCE',            sortOrder: 10 },
  { name: 'Other Platform',       code: 'OTHER',                sortOrder: 11 },
  { name: 'Influencer Marketing', code: 'INFLUENCER',           sortOrder: 12 },
  { name: 'WhatsApp Channel',     code: 'WHATSAPP_CHANNEL',     sortOrder: 13 },
  { name: 'SMS Shoot',            code: 'SMS_SHOOT',            sortOrder: 14 },
  { name: 'WAST Shoot',           code: 'WAST_SHOOT',           sortOrder: 15 },
];

// Tasks from Excel + sensible defaults for platforms not in Excel
const TASKS_BY_CODE = {
  GMB: [
    'Page/Account Optimisation',
    'Business information update (hours, address, phone)',
    'Posts publish (offers, updates, events)',
    'Reviews reply',
    'Spam/fake reviews flag',
    'Photo/Video upload',
    'Q&A monitoring and reply',
    'Messaging replies',
    'Insights check (views, clicks, calls)',
    'Products/Services update (if applicable)',
  ],
  FACEBOOK: [
    'Page/Account Optimisation',
    'Content Posting (photos, videos, reels, Carousel)',
    'Stories',
    'Comments reply (Numbers)',
    'Spam or abusive comments delete (Numbers)',
    'Message Replies (Numbers)',
    'Page invites (Numbers)',
    'Old content repurpose',
    'Mentions aur tags check',
    'Followers comments like',
    'Spam comments delete (if Any)',
    'Fake profiles block (if Any)',
    'Group Share (Numbers)',
    'Group Join & remove (Numbers)',
    'Call & WhatsApp button on all post',
    'Others',
  ],
  INSTAGRAM: [
    'Account Optimisation',
    'Content Posting (photos, videos, reels, Carousel)',
    'Stories',
    'Comments reply (Numbers)',
    'Spam or abusive comments delete (Numbers)',
    'Message Replies (Numbers)',
    'DMs reply',
    'Old content repurpose',
    'Mentions aur tags check',
    'Followers comments like',
    'Spam comments delete (if Any)',
    'Fake profiles block (if Any)',
    'Followers ke comments like',
    'Relevant accounts ke posts par comments',
    'Target audience ke saath engagement',
    'Collaboration inquiries handle',
  ],
  TWITTER: [
    'Account Optimisation',
    'Content Posting (photos, videos, reels, Carousel)',
    'Comments reply (Numbers)',
    'Spam or abusive comments delete (Numbers)',
    'Message Replies (Numbers)',
    'DMs reply',
    'Mentions aur tags check',
    'Followers comments like',
    'Retweets & quote tweets response',
    'Spam replies hide/delete (If Any)',
    'Offensive accounts mute/block (If Any)',
    'Fake accounts report ya block (If Any)',
  ],
  LINKEDIN: [
    'Posts publish',
    'Carousel/PDF/Videos/posts upload',
    'Articles publish',
    'Relevant people & companies tag',
    'External links add',
    'Featured section update (if required)',
    'Comments reply',
    'Direct Messages (Inbox) response',
    'Mentions & tags check',
    'Reactions & comments acknowledgement',
    'Relevant industry posts meaningful comments',
    'Spam comments delete',
    'Inappropriate comments report ya hide',
    'Fake profiles ignore/block',
    'Connection requests accept',
    'Relevant professionals connect',
    'Industry discussions engage',
  ],
  YOUTUBE: [
    'Posts publish',
    'Videos/Shorts/posts upload',
    'Playlists videos add',
    'End screens & cards set',
    'Comments reply',
    'Community tab comments response',
    'Viewer questions Reply',
    'Spam comments delete',
    'Offensive comments hide',
    'Blocked words filter monitor',
    'Users ko hide/block',
    'Notifications and mentions check',
    'Community posts publish',
    'Collaborations and shoutout inquiries handle',
  ],
  META_ADS: [
    'Create Ads',
    'Campaigns monitor',
    'Active, paused aur rejected ads check',
    'Campaign status verify',
    'Delivery issues identify',
    'Spend check',
    'Impressions, Link clicks & Reach monitor',
    'Conversions monitor',
    'Cost Per Lead (CPL) check',
    'Low-performing ads pause',
    'High-performing ads scale',
    'Budget increase/decrease',
    'Audience & Placements performance compare',
    'Lead quality review',
    'Billing status check',
    'Custom Audiences refresh',
    'Meta Pixel status check',
  ],
  GOOGLE_ADS: [
    'Create Ads',
    'Campaigns monitor',
    'Active, paused aur rejected ads check',
    'Campaign status verify',
    'Delivery issues identify',
    'Spend check',
    'Search terms review',
    'Negative keywords add',
    'Keyword performance monitor',
    'Low-performing keywords pause',
    'Match types review',
    'Quality Score monitor',
    'Low-performing ads pause',
    'Bids increase/decrease',
    'Budget adjust',
    'Billing status',
    'Lead quality review',
  ],
  LINKEDIN_ADS: [
    'Campaign setup/review',
    'Active/paused campaigns check',
    'Spend monitor',
    'Impressions & clicks check',
    'Lead form submissions review',
    'Cost Per Lead (CPL) check',
    'Low-performing ads pause',
    'Budget adjust',
    'Audience targeting review',
    'Billing status check',
  ],
  ECOMMERCE: [
    'Product listings update',
    'Price check and update',
    'Inventory status check',
    'Order status review',
    'Customer reviews reply',
    'Negative reviews address',
    'Ad campaigns monitor (if applicable)',
    'Sponsored listings check',
    'Return/refund requests review',
    'Competitor price monitoring',
  ],
  OTHER: [],
  INFLUENCER: [
    'Influencer identification and outreach',
    'Campaign brief send',
    'Content review before posting',
    'Post schedule confirm',
    'Post live check and engagement monitor',
    'Comments reply on influencer post',
    'Performance metrics capture (reach, likes, saves)',
    'Story mentions check',
    'Payment/barter coordination',
    'Campaign report update',
  ],
  WHATSAPP_CHANNEL: [
    'Channel posts publish',
    'Audience engagement check',
    'Reactions monitor',
    'Poll/quiz post (if applicable)',
    'Product/offer broadcast',
    'Link clicks track',
    'Subscriber count check',
    'Content repurpose from other platforms',
  ],
  SMS_SHOOT: [
    'Contact list verify and clean',
    'Message draft and review',
    'DLT template check (TRAI compliance)',
    'Campaign schedule and send',
    'Delivery report check',
    'Failed deliveries identify',
    'Opt-out list update',
    'Campaign performance note (delivery %, response)',
  ],
  WAST_SHOOT: [
    'Contact list verify',
    'WhatsApp template review',
    'Campaign schedule and send',
    'Delivery and read receipt check',
    'Replies monitor and respond',
    'Failed deliveries identify',
    'Opt-out requests handle',
    'Campaign performance note',
  ],
};

// Tasks that need a count field
const COUNT_KEYWORDS = ['(numbers)', '(number)', 'reply', 'replies', 'count', 'invites'];

const hasCount = (title) =>
  COUNT_KEYWORDS.some((kw) => title.toLowerCase().includes(kw));

async function seedDMPlatforms(systemUserId) {
  const userId = systemUserId || new mongoose.Types.ObjectId();
  let platformsCreated = 0;
  let tasksCreated = 0;

  for (const p of PLATFORMS) {
    let platform = await DMPlatform.findOne({ code: p.code });
    if (!platform) {
      platform = await DMPlatform.create({
        name: p.name, code: p.code, sortOrder: p.sortOrder, createdBy: userId,
      });
      platformsCreated++;
    }

    const tasks = TASKS_BY_CODE[p.code] || [];
    for (let i = 0; i < tasks.length; i++) {
      const title = tasks[i];
      const exists = await DMDailyTask.findOne({ platform: platform._id, title, deletedAt: null });
      if (!exists) {
        await DMDailyTask.create({
          platform: platform._id, title, sortOrder: i,
          hasCount: hasCount(title), createdBy: userId,
        });
        tasksCreated++;
      }
    }
  }

  console.log(`[DM Seed] Platforms: ${platformsCreated} created | Tasks: ${tasksCreated} created`);
}

module.exports = { seedDMPlatforms };
