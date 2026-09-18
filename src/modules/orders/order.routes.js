const express = require('express');
const authenticate = require('../../middleware/authMiddleware');
const controller = require('./order.controller');

const router = express.Router();
router.get('/:id/tracking', authenticate, controller.tracking);
module.exports = router;
