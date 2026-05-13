const AppError = require('../utils/AppError');
const User = require('../models/User');

const ROLE_HIERARCHY = ['TEAM_MEMBER', 'DEPT_HEAD', 'SUBADMIN', 'ADMIN', 'SUPERADMIN'];

// requirePermission('crm:lead:create') — checks user's permissions array OR role level
const requirePermission = (permission) => async (req, _res, next) => {
  try {
    if (!req.user) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    if (req.user.role === 'SUPERADMIN') return next();

    const user = await User.findById(req.user.userId).select('permissions role').lean();
    if (!user) return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));

    if (user.permissions.includes(permission)) return next();

    next(new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN'));
  } catch (err) {
    next(err);
  }
};

// requireRole('ADMIN') — checks if user role is at least at this level
const requireRole = (minRole) => (req, _res, next) => {
  if (!req.user) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

  const userLevel = ROLE_HIERARCHY.indexOf(req.user.role);
  const requiredLevel = ROLE_HIERARCHY.indexOf(minRole);

  if (userLevel >= requiredLevel) return next();
  next(new AppError('Insufficient role', 403, 'FORBIDDEN'));
};

module.exports = { requirePermission, requireRole };
