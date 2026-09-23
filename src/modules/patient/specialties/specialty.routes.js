const express = require('express');
const authenticate = require('../../../middleware/authMiddleware');
const controller = require('./specialty.controller');

const router = express.Router();
router.get('/', authenticate, controller.listSpecialties);

module.exports = router;
