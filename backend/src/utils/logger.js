const { createLogger, format, transports } = require('winston');
const path = require('path');

const { combine, timestamp, json, colorize, printf, errors } = format;

const isTest = process.env.NODE_ENV === 'test';
const isDev  = process.env.NODE_ENV === 'development';

const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const base = `${timestamp} [${level}]: ${stack || message}`;
  return Object.keys(meta).length ? `${base} ${JSON.stringify(meta)}` : base;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  format: combine(errors({ stack: true }), timestamp()),
  silent: isTest,
  transports: [
    new transports.Console({
      format: isDev
        ? combine(colorize(), consoleFormat)
        : combine(timestamp(), json()),
    }),
    ...(!isTest && !isDev ? [
      new transports.File({
        filename: path.join(process.cwd(), 'logs', 'error.log'),
        level: 'error',
        format: combine(timestamp(), json()),
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 30,
        tailable: true,
      }),
      new transports.File({
        filename: path.join(process.cwd(), 'logs', 'app.log'),
        format: combine(timestamp(), json()),
        maxsize: 50 * 1024 * 1024, // 50MB
        maxFiles: 14,
        tailable: true,
      }),
    ] : []),
  ],
});

module.exports = logger;
