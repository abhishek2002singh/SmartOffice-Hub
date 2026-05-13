const express = require('express')
const router = express.Router()
const userController = require('../controllers/user.controller')
const authMiddleware = require('../middleware/auth.middleware')
const { requireRole } = require('../middleware/rbac.middleware')

router.use(authMiddleware)
router.use(requireRole('ADMIN'))

router.get('/', userController.list)
router.get('/:id', userController.getOne)
router.post('/', requireRole('SUPERADMIN'), userController.create)
router.patch('/:id', userController.update)
router.delete('/:id', requireRole('SUPERADMIN'), userController.remove)

module.exports = router
