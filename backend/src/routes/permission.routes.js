const express = require('express');
const router = express.Router();
const permController = require('../controllers/permission.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');

router.use(authMiddleware);

router.get('/', requireRole('ADMIN'), permController.listAll);
router.get('/users/:userId', requireRole('ADMIN'), permController.getUserPerms);
router.put('/users/:userId', requireRole('SUPERADMIN'), permController.setUserPerms);

module.exports = router;
