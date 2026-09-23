const express = require('express');
const authenticate = require('../../middleware/authMiddleware');
const requireRole = require('../../middleware/roleMiddleware');
const controller = require('./doctor.controller');

const router = express.Router();
router.post('/register', controller.register);
router.post('/login', controller.login);
router.get('/profile', authenticate, requireRole('DOCTOR'), controller.profile);
router.get('/status', authenticate, requireRole('DOCTOR'), controller.status);
router.patch('/profile', authenticate, requireRole('DOCTOR'), controller.updateProfile);

module.exports = router;