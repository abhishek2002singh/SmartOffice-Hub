require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');

const DEPARTMENTS = [
  { name: 'Sales', code: 'SALES', description: 'Sales & CRM department' },
  { name: 'Digital Marketing', code: 'DM', description: 'Digital marketing operations' },
  { name: 'Graphic & Video', code: 'GD', description: 'Graphic design and video production' },
  { name: 'Development', code: 'DEV', description: 'Web & app development' },
  { name: 'Human Resources', code: 'HR', description: 'HR, payroll & attendance' },
];

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB...');

  // Create a placeholder ObjectId for the bootstrap (Superadmin creates itself)
  const placeholderCreator = new mongoose.Types.ObjectId();

  // Upsert departments
  const deptDocs = [];
  for (const dept of DEPARTMENTS) {
    const d = await Department.findOneAndUpdate(
      { code: dept.code },
      { ...dept, createdBy: placeholderCreator },
      { upsert: true, new: true }
    );
    deptDocs.push(d);
    console.log(`  Department: ${d.name} (${d.code})`);
  }

  // Upsert Superadmin
  let superadmin = await User.findOne({ email: 'ankur@ankdigitalmedia.com' }).select('+password');
  if (!superadmin) {
    superadmin = await User.create({
      name: 'Ankur',
      email: 'ankur@ankdigitalmedia.com',
      password: 'temp_changeme_123',
      role: 'SUPERADMIN',
      isActive: true,
      createdBy: placeholderCreator,
    });
    console.log(`  Superadmin created: ankur@ankdigitalmedia.com`);
  } else {
    console.log(`  Superadmin already exists: ankur@ankdigitalmedia.com`);
  }

  console.log('\nSeeding complete!');
  console.log('Login: ankur@ankdigitalmedia.com / temp_changeme_123');
  await mongoose.disconnect();
};

seed().catch((err) => { console.error(err); process.exit(1); });
