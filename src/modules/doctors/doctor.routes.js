const express = require('express');
const authenticate = require('../../middleware/authMiddleware');
const controller = require('./doctor.controller');

const router = express.Router();
router.get('/', authenticate, controller.listDoctors);

module.exports = router;
