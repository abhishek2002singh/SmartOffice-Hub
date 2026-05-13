require('dotenv').config();
const { server } = require('./app');
const connectDB = require('./config/db');
const { seedPermissions } = require('./utils/seedPermissions');

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  await seedPermissions();
  server.listen(PORT, () => console.log(`Server running on port ${PORT} [${process.env.NODE_ENV}]`));
};

start();
