const express = require('express');
const router = express.Router();
const notifController = require('../controllers/notification.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', notifController.list);
router.patch('/read-all', notifController.markAllRead);
router.patch('/:id/read', notifController.markRead);

module.exports = router;
