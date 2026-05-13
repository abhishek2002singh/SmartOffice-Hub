const express = require('express');
const router  = express.Router();
const auditController = require('../controllers/auditLog.controller');
const authMiddleware  = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');

router.use(authMiddleware);
router.use(requireRole('SUPERADMIN'));

router.get('/',    auditController.list);
router.get('/:id', auditController.getOne);

module.exports = router;
