const User = require('../models/User');
const AppError = require('../utils/AppError');
const { logAudit } = require('../middleware/auditLogger');
const { z } = require('zod');

const profileSchema = z.object({
  name:  z.string().min(2).trim().optional(),
  phone: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword:     z.string().min(6, 'New password must be at least 6 characters'),
});

const updateProfile = async (req, res, next) => {
  try {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: parsed.error.flatten() },
    });

    const user = await User.findById(req.user.userId);
    if (!user) return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));

    const before = user.toSafeObject();
    if (parsed.data.name)  user.name  = parsed.data.name;
    if (parsed.data.phone !== undefined) user.phone = parsed.data.phone;
    user.updatedBy = req.user.userId;
    await user.save();

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'user', resourceId: user._id, before, after: user.toSafeObject(), req });

    res.json({ success: true, data: { user: user.toSafeObject() }, message: 'Profile updated' });
  } catch (err) { next(err); }
};

const changePassword = async (req, res, next) => {
  try {
    const parsed = passwordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: parsed.error.flatten() },
    });

    const user = await User.findById(req.user.userId).select('+password');
    if (!user) return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));

    const match = await user.comparePassword(parsed.data.currentPassword);
    if (!match) return next(new AppError('Current password is incorrect', 400, 'WRONG_PASSWORD'));

    user.password  = parsed.data.newPassword;
    user.updatedBy = req.user.userId;
    await user.save();

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'user', resourceId: user._id, after: { passwordChanged: true }, req });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) { next(err); }
};

module.exports = { updateProfile, changePassword };
