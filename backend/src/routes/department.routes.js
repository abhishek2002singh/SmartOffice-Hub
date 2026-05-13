const express = require('express')
const router = express.Router()
const deptController = require('../controllers/department.controller')
const authMiddleware = require('../middleware/auth.middleware')
const { requireRole } = require('../middleware/rbac.middleware')

router.use(authMiddleware)

router.get('/', deptController.list)
router.get('/:id', deptController.getOne)
router.post('/', requireRole('SUPERADMIN'), deptController.create)
router.patch('/:id', requireRole('ADMIN'), deptController.update)
router.delete('/:id', requireRole('SUPERADMIN'), deptController.remove)

module.exports = router
