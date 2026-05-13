const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');

router.use(authMiddleware);

router.get('/', requireRole('ADMIN'), userController.list);
router.get('/:id', requireRole('ADMIN'), userController.getOne);

module.exports = router;
