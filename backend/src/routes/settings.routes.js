const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');

router.use(authMiddleware);

router.get('/', settingsController.get);
router.patch('/', requireRole('SUPERADMIN'), settingsController.update);

module.exports = router;
