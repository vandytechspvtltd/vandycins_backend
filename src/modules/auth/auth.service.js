const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const database = require('../../database/database');
const config = require('../../config/env');
const {
    OTP_EXPIRY_MS,
    OTP_COOLDOWN_MS,
    OTP_MAX_ATTEMPTS,
    otpStore,
    normalizeIndianPhone,
    generateOtp,
    hashOtp
} = require('../../utils/otp');

function findUserByPhoneAndRole(phone, role) {
    return Object.values(database.users).find(user => user.phone === phone && user.role === role);
}

function ensureDoctorProfile(user) {
    if (!user || user.role !== 'DOCTOR') return null;
    let doctor = database.doctors.find(item => item.id === user.id);
    if (!doctor) {
        doctor = {
            id: user.id,
            name: user.name || 'Dr. Test Doctor',
            specialty: 'General Physician',
            clinic_name: 'VandyCins Telehealth Clinic',
            registration_number: `TEST-${user.id}`,
            rating: 5.0,
            experience_years: 1,
            consultation_fee: 500,
            is_online: true,
            is_verified: true,
            is_active: true
        };
        database.doctors.push(doctor);
    } else {
        doctor.is_online = true;
        if ((!doctor.name || !doctor.name.trim()) && user.name && user.name.trim()) doctor.name = user.name.trim();
    }
    database.liveDoctorId = doctor.id;
    return doctor;
}

function createAccessToken(user) {
    if (!config.jwtSecret) throw new Error('JWT_SECRET is not configured.');
    return jwt.sign({ sub: user.id, role: user.role, phone: user.phone }, config.jwtSecret, { expiresIn: config.accessTokenTtl });
}

async function sendOtpSms({ phone, otp, role }) {
    if (config.otpProvider === 'console') {
        console.log(`[OTP] DEV OTP phone=${phone} role=${role} otp=${otp}`);
        return { success: true, provider: 'console' };
    }
    throw new Error(`Unsupported OTP_PROVIDER="${config.otpProvider}". Configure a real SMS provider or use OTP_PROVIDER=console for testing.`);
}

function getOrCreateUser(phone, role) {
    let user = findUserByPhoneAndRole(phone, role);
    if (!user && config.devOtpBypass) {
        const userId = `${role === 'DOCTOR' ? 'doc' : 'pat'}_${phone.replace(/\D/g, '')}`;
        user = { id: userId, phone, role, name: '', isProfileCompleted: false };
        database.users[userId] = user;
        console.log(`[AUTH] DEV USER CREATED phone=${phone} role=${role} id=${userId}`);
    }
    return user;
}

function loginResponse(user) {
    return {
        success: true,
        access_token: createAccessToken(user),
        refresh_token: `refresh_${crypto.randomBytes(32).toString('hex')}`,
        user_id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        is_profile_completed: Boolean(user.isProfileCompleted)
    };
}

async function requestOtp(phoneInput, role) {
    const phone = normalizeIndianPhone(phoneInput);
    if (!phone) return { error: [400, 'Valid mobile number is required.'] };
    if (!['DOCTOR', 'PATIENT'].includes(role)) return { error: [400, 'Role must be DOCTOR or PATIENT.'] };
    const user = getOrCreateUser(phone, role);
    if (!user) return { error: [404, `No ${role.toLowerCase()} account is registered with this mobile number.`] };
    const key = `${phone}:${role}`;
    const existing = otpStore.get(key);
    if (existing && Date.now() - existing.lastSentAt < OTP_COOLDOWN_MS) {
        const remaining = Math.ceil((OTP_COOLDOWN_MS - (Date.now() - existing.lastSentAt)) / 1000);
        return { error: [429, 'Please wait before requesting another OTP.'], cooldown_seconds: remaining };
    }
    const now = Date.now();
    const otp = generateOtp();
    const requestId = `req_${now}_${crypto.randomBytes(6).toString('hex')}`;
    otpStore.set(key, { phone, role, userId: user.id, otpHash: hashOtp(otp), requestId, createdAt: now, expiresAt: now + OTP_EXPIRY_MS, lastSentAt: now, attempts: 0 });
    try { await sendOtpSms({ phone, otp, role }); } catch (error) { otpStore.delete(key); throw error; }
    return { success: true, message: 'OTP sent successfully.', request_id: requestId, cooldown_seconds: Math.floor(OTP_COOLDOWN_MS / 1000) };
}

function verifyOtp(phoneInput, otp, role) {
    const phone = normalizeIndianPhone(phoneInput);
    if (!phone) return { error: [400, 'Valid mobile number is required.'] };
    if (!['DOCTOR', 'PATIENT'].includes(role)) return { error: [400, 'Role must be DOCTOR or PATIENT.'] };
    if (!/^\d{4}$/.test(otp)) return { error: [400, 'OTP must be exactly 4 digits.'] };
    let user = findUserByPhoneAndRole(phone, role);
    if (!user) {
        const userId = `${role === 'DOCTOR' ? 'doc' : 'pat'}_${phone.replace(/\D/g, '')}`;
        user = { id: userId, phone, role, name: '', isProfileCompleted: false };
        database.users[userId] = user;
        console.log(`[AUTH] AUTO CREATED USER ON VERIFY phone=${phone} role=${role} id=${userId}`);
    }
    const key = `${phone}:${role}`;
    const storedOtp = otpStore.get(key);
    if (!storedOtp) return { error: [401, 'OTP not found or expired. Please request a new OTP.'] };
    if (storedOtp.userId !== user.id) { otpStore.delete(key); return { error: [401, 'Invalid OTP request.'] }; }
    if (Date.now() > storedOtp.expiresAt) { otpStore.delete(key); return { error: [401, 'OTP has expired. Please request a new OTP.'] }; }
    if (storedOtp.attempts >= OTP_MAX_ATTEMPTS) { otpStore.delete(key); return { error: [429, 'Too many incorrect OTP attempts. Please request a new OTP.'] }; }
    const hashesMatch = config.devOtpBypass || crypto.timingSafeEqual(Buffer.from(hashOtp(otp), 'hex'), Buffer.from(storedOtp.otpHash, 'hex'));
    if (!hashesMatch) {
        storedOtp.attempts += 1;
        if (storedOtp.attempts >= OTP_MAX_ATTEMPTS) { otpStore.delete(key); return { error: [429, 'Too many incorrect OTP attempts. Please request a new OTP.'] }; }
        return { error: [401, 'Invalid OTP.'], remaining_attempts: OTP_MAX_ATTEMPTS - storedOtp.attempts };
    }
    otpStore.delete(key);
    if (user.role === 'DOCTOR' && !ensureDoctorProfile(user)) return { error: [500, 'Unable to activate doctor profile.'] };
    return loginResponse(user);
}

module.exports = { findUserByPhoneAndRole, ensureDoctorProfile, createAccessToken, requestOtp, verifyOtp };
