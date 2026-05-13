const Permission = require('../models/Permission');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { logAudit } = require('../middleware/auditLogger');
const PERMISSIONS = require('../utils/permissionSeed');

// GET /permissions — all defined permissions (grouped by module)
const listAll = async (req, res, next) => {
  try {
    const perms = await Permission.find({ deletedAt: null }).sort('module key').lean();
    const grouped = perms.reduce((acc, p) => {
      if (!acc[p.module]) acc[p.module] = [];
      acc[p.module].push(p);
      return acc;
    }, {});
    res.json({ success: true, data: { permissions: perms, grouped } });
  } catch (err) { next(err); }
};

// GET /permissions/users/:userId — get a user's current permissions
const getUserPerms = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.params.userId, deletedAt: null }).select('name email role permissions').lean();
    if (!user) return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    res.json({ success: true, data: { user } });
  } catch (err) { next(err); }
};

// PUT /permissions/users/:userId — set (replace) a user's permissions
const setUserPerms = async (req, res, next) => {
  try {
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) return next(new AppError('permissions must be an array', 400, 'VALIDATION_ERROR'));

    const user = await User.findOne({ _id: req.params.userId, deletedAt: null });
    if (!user) return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    if (user.role === 'SUPERADMIN') return next(new AppError('Cannot restrict Superadmin permissions', 403, 'FORBIDDEN'));

    // Validate all keys exist
    const validKeys = PERMISSIONS.map((p) => p.key);
    const invalid = permissions.filter((p) => !validKeys.includes(p));
    if (invalid.length) return next(new AppError(`Invalid permission keys: ${invalid.join(', ')}`, 400, 'VALIDATION_ERROR'));

    const before = { permissions: user.permissions };
    user.permissions = permissions;
    user.updatedBy = req.user.userId;
    await user.save();

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'user_permissions', resourceId: user._id, before, after: { permissions }, req });

    res.json({ success: true, data: { permissions }, message: 'Permissions updated' });
  } catch (err) { next(err); }
};

module.exports = { listAll, getUserPerms, setUserPerms };
