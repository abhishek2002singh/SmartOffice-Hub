const User = require('../models/User');
const AppError = require('../utils/AppError');

const list = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { deletedAt: null };
    if (req.query.role) filter.role = req.query.role;
    if (req.query.department) filter.department = req.query.department;

    const [users, total] = await Promise.all([
      User.find(filter).populate('department', 'name code').skip(skip).limit(limit).sort('-createdAt').lean(),
      User.countDocuments(filter),
    ]);

    res.json({ success: true, data: { users, total, page, limit } });
  } catch (err) {
    next(err);
  }
};

const getOne = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.params.id, deletedAt: null })
      .populate('department', 'name code')
      .lean();
    if (!user) return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getOne };
