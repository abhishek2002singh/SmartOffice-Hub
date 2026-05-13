const authService = require('../services/auth.service');
const { loginSchema, refreshSchema } = require('../validators/auth.validator');
const { logAudit } = require('../middleware/auditLogger');
const User = require('../models/User');
const AppError = require('../utils/AppError');

const login = async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: parsed.error.flatten() },
      });
    }

    const { email, password } = parsed.data;
    const { accessToken, refreshToken, user } = await authService.login(email, password);

    await logAudit({ userId: user._id, action: 'UPDATE', resource: 'user', resourceId: user._id, after: { lastLogin: new Date() }, req });

    res.json({ success: true, data: { accessToken, refreshToken, user } });
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: parsed.error.flatten() },
      });
    }

    const tokens = await authService.refresh(parsed.data.refreshToken);
    res.json({ success: true, data: tokens });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const parsed = refreshSchema.safeParse(req.body);
    if (parsed.success) {
      await authService.logout(req.user.userId, parsed.data.refreshToken);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.user.userId, deletedAt: null })
      .populate('department', 'name code')
      .lean();

    if (!user) return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));

    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, refresh, logout, me };
