const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth.middleware');
const ctrl    = require('../controllers/search.controller');

router.use(auth);
router.get('/', ctrl.globalSearch);

module.exports = router;
