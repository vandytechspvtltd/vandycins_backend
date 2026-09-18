const express = require('express');
const authenticate = require('../../middleware/authMiddleware');
const controller = require('./healthService.controller');

const router = express.Router();
router.get('/', authenticate, controller.listHealthServices);

module.exports = router;
