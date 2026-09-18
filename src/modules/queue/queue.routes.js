const express = require('express');
const authenticate = require('../../middleware/authMiddleware');
const controller = require('./queue.controller');

const router = express.Router();
router.get('/live', authenticate, controller.getLiveQueue);
module.exports = router;
