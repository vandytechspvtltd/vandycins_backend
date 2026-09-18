const crypto = require('crypto');

const OTP_LENGTH = 4;
const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_COOLDOWN_MS = 45 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const otpStore = new Map();

function normalizeIndianPhone(phone) {
    let value = String(phone || '').trim().replace(/[^\d+]/g, '');
    if (/^\d{10}$/.test(value)) return `+91${value}`;
    if (/^91\d{10}$/.test(value)) return `+${value}`;
    if (/^\+91\d{10}$/.test(value)) return value;
    if (/^\+[1-9]\d{9,14}$/.test(value)) return value;
    return null;
}

function generateOtp() {
    return crypto.randomInt(0, 10000).toString().padStart(OTP_LENGTH, '0');
}

function hashOtp(otp) {
    return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

module.exports = {
    OTP_EXPIRY_MS,
    OTP_COOLDOWN_MS,
    OTP_MAX_ATTEMPTS,
    otpStore,
    normalizeIndianPhone,
    generateOtp,
    hashOtp
};
