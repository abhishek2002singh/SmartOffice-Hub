const express = require('express');
const router  = express.Router();
const profileController = require('../controllers/profile.controller');
const authMiddleware    = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.patch('/',          profileController.updateProfile);
router.patch('/password',  profileController.changePassword);

module.exports = router;
