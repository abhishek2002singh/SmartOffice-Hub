const Department = require('../models/Department')
const AppError = require('../utils/AppError')
const { createDeptSchema, updateDeptSchema } = require('../validators/department.validator')
const { logAudit } = require('../middleware/auditLogger')

const list = async (req, res, next) => {
  try {
    const depts = await Department.find({ deletedAt: null }).populate('head', 'name email').sort('name').lean()
    res.json({ success: true, data: { departments: depts, total: depts.length } })
  } catch (err) { next(err) }
}

const getOne = async (req, res, next) => {
  try {
    const dept = await Department.findOne({ _id: req.params.id, deletedAt: null }).populate('head', 'name email').lean()
    if (!dept) return next(new AppError('Department not found', 404, 'NOT_FOUND'))
    res.json({ success: true, data: { department: dept } })
  } catch (err) { next(err) }
}

const create = async (req, res, next) => {
  try {
    const parsed = createDeptSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: parsed.error.flatten() } })

    const exists = await Department.findOne({ $or: [{ name: parsed.data.name }, { code: parsed.data.code }], deletedAt: null })
    if (exists) return next(new AppError('Department name or code already exists', 409, 'DUPLICATE'))

    const dept = await Department.create({ ...parsed.data, createdBy: req.user.userId })
    await logAudit({ userId: req.user.userId, action: 'CREATE', resource: 'department', resourceId: dept._id, after: dept.toObject(), req })

    res.status(201).json({ success: true, data: { department: dept }, message: 'Department created' })
  } catch (err) { next(err) }
}

const update = async (req, res, next) => {
  try {
    const parsed = updateDeptSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: parsed.error.flatten() } })

    const dept = await Department.findOne({ _id: req.params.id, deletedAt: null })
    if (!dept) return next(new AppError('Department not found', 404, 'NOT_FOUND'))

    const before = dept.toObject()
    Object.assign(dept, { ...parsed.data, updatedBy: req.user.userId })
    if (parsed.data.skills !== undefined) dept.markModified('skills')
    await dept.save()

    await logAudit({ userId: req.user.userId, action: 'UPDATE', resource: 'department', resourceId: dept._id, before, after: dept.toObject(), req })
    res.json({ success: true, data: { department: dept }, message: 'Department updated' })
  } catch (err) { next(err) }
}

const remove = async (req, res, next) => {
  try {
    const dept = await Department.findOne({ _id: req.params.id, deletedAt: null })
    if (!dept) return next(new AppError('Department not found', 404, 'NOT_FOUND'))

    const before = dept.toObject()
    dept.deletedAt = new Date()
    dept.updatedBy = req.user.userId
    await dept.save()

    await logAudit({ userId: req.user.userId, action: 'DELETE', resource: 'department', resourceId: dept._id, before, req })
    res.json({ success: true, message: 'Department deleted' })
  } catch (err) { next(err) }
}

module.exports = { list, getOne, create, update, remove }
