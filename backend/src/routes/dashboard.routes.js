const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const ctrl    = require('../controllers/dashboard.controller');

router.use(auth);
router.get('/master', ctrl.masterDashboard);

module.exports = router;
