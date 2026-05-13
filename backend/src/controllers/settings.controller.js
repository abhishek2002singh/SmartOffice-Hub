const Settings = require('../models/Settings');
const { z } = require('zod');
const { logAudit } = require('../middleware/auditLogger');

const settingsSchema = z.object({
  companyName: z.string().min(2).optional(),
  companyEmail: z.string().email().optional(),
  companyPhone: z.string().optional(),
  companyWebsite: z.string().optional(),
  companyAddress: z.string().optional(),
  fiscalYearStart: z.enum(['January', 'April', 'July', 'October']).optional(),
  timezone: z.string().optional(),
});

const get = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});
    res.json({ success: true, data: { settings } });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: parsed.error.flatten() } });

    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();

    const before = settings.toObject();
    Object.assign(settings, { ...parsed.data, updatedBy: req.user.userId });
    await settings.save();

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'settings', resourceId: settings._id, before, after: settings.toObject(), req });
    res.json({ success: true, data: { settings }, message: 'Settings updated' });
  } catch (err) { next(err); }
};

module.exports = { get, update };
