const mongoose = require('mongoose');
const logger   = require('../utils/logger');

const SLOW_QUERY_MS = 200;

const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGODB_URI);
  logger.info(`MongoDB connected: ${conn.connection.host}`);

  if (process.env.NODE_ENV !== 'test') {
    mongoose.set('debug', (collectionName, method, query, doc, opts) => {
      const start = Date.now();
      process.nextTick(() => {
        const ms = Date.now() - start;
        if (ms >= SLOW_QUERY_MS) {
          logger.warn(`Slow query [${ms}ms] ${collectionName}.${method}`, { query, ms });
        }
      });
    });
  }
};

module.exports = connectDB;
