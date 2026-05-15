require('dotenv').config();
const { server, io } = require('./app');
const connectDB = require('./config/db');
const { seedPermissions } = require('./utils/seedPermissions');
const { startStaleLeadDetector }  = require('./services/staleLeadDetector');
const { startRenewalAlertService } = require('./services/renewalAlertService');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();
    await seedPermissions();
    server.listen(PORT, () => {
      logger.info(`AMS API running on port ${PORT} [${process.env.NODE_ENV}]`);
      startStaleLeadDetector(io);
      startRenewalAlertService(io);
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

start();
