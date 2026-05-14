const Permission = require('../models/Permission');
const PERMISSIONS = require('./permissionSeed');
const { seedLeadSources }    = require('./seedLeadSources');
const { seedServiceCatalog } = require('./seedServiceCatalog');
const { seedDMPlatforms }      = require('./seedDMPlatforms');
const { seedDMAuditMetrics }   = require('./seedDMAuditMetrics');

const seedPermissions = async () => {
  for (const perm of PERMISSIONS) {
    await Permission.findOneAndUpdate({ key: perm.key }, perm, { upsert: true });
  }
  console.log(`[seed] ${PERMISSIONS.length} permissions seeded`);
  await seedLeadSources();
  await seedServiceCatalog();
  await seedDMPlatforms();
  await seedDMAuditMetrics();
};

module.exports = { seedPermissions };
