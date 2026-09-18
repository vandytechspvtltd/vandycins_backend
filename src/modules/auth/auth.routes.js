const express = require('express');
const authenticate = require('../../middleware/authMiddleware');
const controller = require('./auth.controller');

const router = express.Router();
router.post('/send-otp', controller.sendOtp);
router.post('/verify-otp', controller.verifyOtp);
router.post('/refresh-token', authenticate, controller.refreshToken);
router.post('/logout', authenticate, controller.logout);

module.exports = router;
