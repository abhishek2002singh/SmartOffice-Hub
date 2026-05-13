const Permission = require('../models/Permission');
const PERMISSIONS = require('./permissionSeed');

const seedPermissions = async () => {
  for (const perm of PERMISSIONS) {
    await Permission.findOneAndUpdate({ key: perm.key }, perm, { upsert: true });
  }
  console.log(`  Permissions seeded: ${PERMISSIONS.length} permissions`);
};

module.exports = { seedPermissions };
