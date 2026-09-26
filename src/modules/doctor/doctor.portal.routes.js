const express = require('express');
const authenticate = require('../../middleware/authMiddleware');
const requireRole = require('../../middleware/roleMiddleware');
const authService = require('../auth/auth.service');
const controller = require('./doctor.portal.controller');
const doctorController = require('./doctor.controller');

const router = express.Router();

router.post('/register', doctorController.register);
router.post('/login', doctorController.login);
router.post('/logout', (req, res) => {
    const refreshToken = req.body?.refreshToken || req.body?.refresh_token;
    if (refreshToken) authService.revokeRefreshToken(refreshToken);
    else if (req.user) authService.revokeAllRefreshTokens(req.user.id);
    return res.json({ success: true, message: 'Logged out successfully.' });
});
router.post('/refresh', (req, res) => {
    try {
        const result = authService.rotateRefreshToken(req.body?.refreshToken || req.body?.refresh_token);
        return res.json({
            success: true,
            data: { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user },
            access_token: result.accessToken,
            refresh_token: result.refreshToken
        });
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }
});

router.get('/profile', authenticate, requireRole('DOCTOR'), controller.profile);
router.patch('/profile', authenticate, requireRole('DOCTOR'), controller.updateProfile);
router.get('/status', authenticate, requireRole('DOCTOR'), controller.status);
router.get('/appointments', authenticate, requireRole('DOCTOR'), controller.appointments);
router.get('/appointments/:appointmentId', authenticate, requireRole('DOCTOR'), controller.appointmentDetails);
router.patch('/appointments/:appointmentId/status', authenticate, requireRole('DOCTOR'), controller.appointmentStatus);
router.get('/patients', authenticate, requireRole('DOCTOR'), controller.patients);
router.get('/patients/:patientId', authenticate, requireRole('DOCTOR'), controller.patientDetails);

module.exports = router;
