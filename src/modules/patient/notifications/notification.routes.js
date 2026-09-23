const express = require('express');
const authenticate = require('../../../middleware/authMiddleware');
const controller = require('./notification.controller');

const router = express.Router();
router.get('/unread-count', authenticate, controller.unreadCount);

module.exports = router;
