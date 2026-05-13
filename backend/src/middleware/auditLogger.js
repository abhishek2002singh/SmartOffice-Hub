const AuditLog = require('../models/AuditLog');

// Usage: auditLogger('CREATE', 'lead') — returns Express middleware
const auditLogger = (action, resource) => async (req, _res, next) => {
  // Store on req so controller can attach resourceId + changes after the operation
  req.audit = { action, resource };
  next();
};

// Call this inside a controller after the DB write to actually persist the log
const logAudit = async ({ userId, action, resource, resourceId, before, after, req }) => {
  try {
    await AuditLog.create({
      userId,
      action,
      resource,
      resourceId,
      changes: { before: before || null, after: after || null },
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.headers?.['user-agent'],
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
};

module.exports = { auditLogger, logAudit };
