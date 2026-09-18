const dotenv = require('dotenv');

dotenv.config();

const config = {
    port: process.env.SERVER_PORT || 5000,
    agoraAppId: (process.env.AGORA_APP_ID || '').trim(),
    agoraAppCertificate: (process.env.AGORA_APP_CERTIFICATE || '').trim(),
    jwtSecret: (process.env.JWT_SECRET || '').trim(),
    accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
    agoraTokenTtlSeconds: Math.max(
        300,
        Number(process.env.AGORA_TOKEN_TTL_SECONDS || 3600)
    ),
    devOtpBypass: String(process.env.DEV_OTP_BYPASS || 'false')
        .trim()
        .toLowerCase() === 'true',
    otpProvider: String(process.env.OTP_PROVIDER || 'console')
        .trim()
        .toLowerCase()
};

if (process.env.NODE_ENV === 'production') {
    if (!config.agoraAppId) {
        throw new Error('AGORA_APP_ID is required in production.');
    }
    if (!config.agoraAppCertificate) {
        throw new Error('AGORA_APP_CERTIFICATE is required in production.');
    }
    if (!config.jwtSecret || config.jwtSecret.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters.');
    }
}

module.exports = config;
