const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const { seedPermissions } = require('../src/utils/seedPermissions');

// Connect once before all tests in each file
global.setupDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }
  await mongoose.connection.dropDatabase();
  await seedPermissions();
};

global.teardownDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
};
