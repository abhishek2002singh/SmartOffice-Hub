require('dotenv').config();
const mongoose  = require('mongoose');
const connectDB = require('../config/db');
require('../models/index');

const LeaveType = require('../models/LeaveType');

const DEFAULT_LEAVE_TYPES = [
  { code: 'CL',  name: 'Casual Leave',    annualQuota: 12, halfDayAllowed: true,  carryForwardEnabled: false, requireDocuments: false, applicableGender: 'all' },
  { code: 'SL',  name: 'Sick Leave',      annualQuota: 12, halfDayAllowed: true,  carryForwardEnabled: false, requireDocuments: false, applicableGender: 'all' },
  { code: 'EL',  name: 'Earned Leave',    annualQuota: 15, halfDayAllowed: true,  carryForwardEnabled: true,  maxCarryForward: 30, requireDocuments: false, applicableGender: 'all' },
  { code: 'ML',  name: 'Maternity Leave', annualQuota: 90, halfDayAllowed: false, carryForwardEnabled: false, requireDocuments: true,  applicableGender: 'female' },
  { code: 'PL',  name: 'Paternity Leave', annualQuota: 15, halfDayAllowed: false, carryForwardEnabled: false, requireDocuments: false, applicableGender: 'male' },
  { code: 'LOP', name: 'Loss of Pay',     annualQuota: 0,  halfDayAllowed: true,  carryForwardEnabled: false, requireDocuments: false, applicableGender: 'all' },
];

(async () => {
  try {
    await connectDB();
    let created = 0;
    for (const lt of DEFAULT_LEAVE_TYPES) {
      const exists = await LeaveType.findOne({ code: lt.code });
      if (!exists) {
        await LeaveType.create(lt);
        console.log(`Created: ${lt.code} — ${lt.name}`);
        created++;
      } else {
        console.log(`Skipped (exists): ${lt.code}`);
      }
    }
    console.log(`\nDone. ${created} leave types seeded.`);
  } catch (err) {
    console.error(err.message);
  } finally {
    await mongoose.disconnect();
  }
})();
