const crypto = require('crypto');
const authService = require('./auth.service');
const database = require('../../database/database');

async function sendOtp(req, res) {
    try {
        const role = String(req.body?.role || '').trim().toUpperCase();
        const result = await authService.requestOtp(req.body?.phone, role);
        if (result.error) return res.status(result.error[0]).json({ success: false, message: result.error[1], ...(result.cooldown_seconds ? { cooldown_seconds: result.cooldown_seconds } : {}) });
        return res.status(200).json(result);
    } catch (error) {
        console.error('[AUTH] SEND OTP FAILED:', error);
        return res.status(500).json({ success: false, message: error.message || 'Unable to send OTP.' });
    }
}

function verifyOtp(req, res) {
    try {
        const role = String(req.body?.role || '').trim().toUpperCase();
        const result = authService.verifyOtp(req.body?.phone, String(req.body?.otp || '').trim(), role);
        if (result.error) return res.status(result.error[0]).json({ success: false, message: result.error[1], ...(result.remaining_attempts !== undefined ? { remaining_attempts: result.remaining_attempts } : {}) });
        return res.status(200).json(result);
    } catch (error) {
        console.error('[AUTH] VERIFY OTP FAILED:', error);
        return res.status(500).json({ success: false, message: error.message || 'Unable to verify OTP.' });
    }
}

function refreshToken(req, res) {
    return res.json({ access_token: authService.createAccessToken(req.user), refresh_token: `refresh_${crypto.randomBytes(32).toString('hex')}` });
}

function logout(req, res) { return res.status(200).send(); }

module.exports = { sendOtp, verifyOtp, refreshToken, logout };
