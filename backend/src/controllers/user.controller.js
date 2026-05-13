const User = require('../models/User')
const AppError = require('../utils/AppError')
const { createUserSchema, updateUserSchema } = require('../validators/user.validator')
const { logAudit } = require('../middleware/auditLogger')

const list = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    const filter = { deletedAt: null }
    if (req.query.role) filter.role = req.query.role
    if (req.query.department) filter.department = req.query.department
    if (req.query.q) filter.name = { $regex: req.query.q, $options: 'i' }

    const [users, total] = await Promise.all([
      User.find(filter).populate('department', 'name code').skip(skip).limit(limit).sort('-createdAt').lean(),
      User.countDocuments(filter),
    ])

    res.json({ success: true, data: { users, total, page, limit, pages: Math.ceil(total / limit) } })
  } catch (err) { next(err) }
}

const getOne = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.params.id, deletedAt: null }).populate('department', 'name code').lean()
    if (!user) return next(new AppError('User not found', 404, 'USER_NOT_FOUND'))
    res.json({ success: true, data: { user } })
  } catch (err) { next(err) }
}

const create = async (req, res, next) => {
  try {
    const parsed = createUserSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: parsed.error.flatten() } })

    const { name, email, password, role, department, phone } = parsed.data
    const exists = await User.findOne({ email })
    if (exists) return next(new AppError('Email already in use', 409, 'DUPLICATE_EMAIL'))

    const user = await User.create({ name, email, password, role, department: department || null, phone, createdBy: req.user.userId })
    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'user', resourceId: user._id, after: user.toSafeObject(), req })

    res.status(201).json({ success: true, data: { user: user.toSafeObject() }, message: 'User created successfully' })
  } catch (err) { next(err) }
}

const update = async (req, res, next) => {
  try {
    const parsed = updateUserSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: parsed.error.flatten() } })

    const user = await User.findOne({ _id: req.params.id, deletedAt: null })
    if (!user) return next(new AppError('User not found', 404, 'USER_NOT_FOUND'))

    const before = user.toSafeObject()
    Object.assign(user, { ...parsed.data, updatedBy: req.user.userId })
    await user.save()

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'user', resourceId: user._id, before, after: user.toSafeObject(), req })
    res.json({ success: true, data: { user: user.toSafeObject() }, message: 'User updated successfully' })
  } catch (err) { next(err) }
}

const remove = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.params.id, deletedAt: null })
    if (!user) return next(new AppError('User not found', 404, 'USER_NOT_FOUND'))

    if (user.role === 'SUPERADMIN') return next(new AppError('Cannot delete Superadmin', 403, 'FORBIDDEN'))

    const before = user.toSafeObject()
    user.deletedAt = new Date()
    user.updatedBy = req.user.userId
    await user.save()

    await logAudit({ userId: req.user.userId, action: 'DELETE', resource: 'user', resourceId: user._id, before, req })
    res.json({ success: true, message: 'User deleted successfully' })
  } catch (err) { next(err) }
}

module.exports = { list, getOne, create, update, remove }
