const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config();

// Required packages:
// npm install agora-token jsonwebtoken
// Required packages:
// npm install agora-token jsonwebtoken

let RtcTokenBuilder = null;
let RtcRole = null;
let jwt = null;

try {
    const agora = require('agora-token');

    RtcTokenBuilder = agora.RtcTokenBuilder;
    RtcRole = agora.Role;

    console.log('[AGORA] agora-token loaded successfully.');
} catch (e) {
    console.error(
        '[AGORA] agora-token package is missing. ' +
        'Run: npm install agora-token'
    );
}

try {
    jwt = require('jsonwebtoken');

    console.log('[AUTH] jsonwebtoken loaded successfully.');
} catch (e) {
    console.error(
        '[AUTH] jsonwebtoken package is missing. ' +
        'Run: npm install jsonwebtoken'
    );
}
// ====================================================
// JWT
// ====================================================

try {

    jwt = require('jsonwebtoken');

    console.log(
        '[AUTH] jsonwebtoken loaded successfully.'
    );

} catch (e) {

    console.error(
        '[AUTH] jsonwebtoken package is missing. ' +
        'Run: npm install jsonwebtoken'
    );
}


// ====================================================
// OTP CONFIGURATION & STORAGE
// ====================================================

const OTP_LENGTH = 4;
const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_COOLDOWN_MS = 45 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const otpStore = new Map();

function normalizeIndianPhone(phone) {
    let value = String(phone || '').trim();

    value = value.replace(/[^\d+]/g, '');

    if (/^\d{10}$/.test(value)) {
        return `+91${value}`;
    }

    if (/^91\d{10}$/.test(value)) {
        return `+${value}`;
    }

    if (/^\+91\d{10}$/.test(value)) {
        return value;
    }

    if (/^\+[1-9]\d{9,14}$/.test(value)) {
        return value;
    }

    return null;
}

function generateOtp() {
    return crypto
        .randomInt(0, 10000)
        .toString()
        .padStart(OTP_LENGTH, '0');
}

function hashOtp(otp) {
    return crypto
        .createHash('sha256')
        .update(String(otp))
        .digest('hex');
}

function findUserByPhoneAndRole(phone, role) {
    return Object.values(database.users).find(
        user =>
            user.phone === phone &&
            user.role === role
    );
}

async function sendOtpSms({
    phone,
    otp,
    role
}) {
    const provider =
        String(
            process.env.OTP_PROVIDER || 'console'
        )
            .trim()
            .toLowerCase();

    if (provider === 'console') {

        console.log(
            `[OTP] DEV OTP ` +
            `phone=${phone} ` +
            `role=${role} ` +
            `otp=${otp}`
        );

        return {
            success: true,
            provider: 'console'
        };
    }

    throw new Error(
        'OTP SMS provider is not configured.'
    );
}
const app = express();

const PORT = process.env.SERVER_PORT || 5000;

app.use(cors());
app.use(express.json());


// ====================================================
// REQUEST LOGGER
// ====================================================

app.use((req, res, next) => {
    console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.url}`
    );

    next();
});


// ====================================================
// ENVIRONMENT CONFIG
// ====================================================

const AGORA_APP_ID =
    (process.env.AGORA_APP_ID || '').trim();

const AGORA_APP_CERTIFICATE =
    (process.env.AGORA_APP_CERTIFICATE || '').trim();

const JWT_SECRET =
    (process.env.JWT_SECRET || '').trim();

const ACCESS_TOKEN_TTL =
    process.env.ACCESS_TOKEN_TTL || '15m';

const AGORA_TOKEN_TTL_SECONDS =
    Math.max(
        300,
        Number(
            process.env.AGORA_TOKEN_TTL_SECONDS || 3600
        )
    );


// ====================================================
// PRODUCTION CONFIG VALIDATION
// ====================================================

if (process.env.NODE_ENV === 'production') {

    if (!AGORA_APP_ID) {
        throw new Error(
            'AGORA_APP_ID is required in production.'
        );
    }

    if (!AGORA_APP_CERTIFICATE) {
        throw new Error(
            'AGORA_APP_CERTIFICATE is required in production.'
        );
    }

    if (!JWT_SECRET || JWT_SECRET.length < 32) {
        throw new Error(
            'JWT_SECRET must be at least 32 characters.'
        );
    }
}


// ====================================================
// DATABASE
// ====================================================

const database = {

    doctors: [
        {
            id: 'doc_101',
            name: 'Dr. Rajesh Kumar',
            specialty: 'General Physician & Cardiologist',
            clinic_name: 'Apollo Health Clinic',
            registration_number: 'MCI-48291',
            rating: 4.9,
            experience_years: 14,
            consultation_fee: 500,
            is_online: true
        },

        {
            id: 'doc_102',
            name: 'Dr. Priya Sharma',
            specialty: 'Dermatologist & Cosmetologist',
            clinic_name: 'Skin & Care Clinic',
            registration_number: 'DMC-83921',
            rating: 4.8,
            experience_years: 9,
            consultation_fee: 650,
            is_online: true
        },

        {
            id: 'doc_103',
            name: 'Dr. Arvind Mehta',
            specialty: 'Pediatrician',
            clinic_name: 'Rainbow Children Hospital',
            registration_number: 'KMC-67123',
            rating: 4.9,
            experience_years: 16,
            consultation_fee: 600,
            is_online: false
        }
    ],

    liveQueue: {
        currentServingToken: 12,
        waitingCount: 2,
        userToken: 14,
        estimatedWaitMinutes: 6,
        isUserTurn: true,

        upcomingQueue: [
            {
                token_number: 12,
                patient_name: 'Amit Patel',
                is_user: false,
                status: 'In Consultation'
            },

            {
                token_number: 13,
                patient_name: 'Sunita Verma',
                is_user: false,
                status: 'Next'
            },

            {
                token_number: 14,
                patient_name: 'Rahul Sharma',
                is_user: true,
                status: 'Waiting'
            },

            {
                token_number: 15,
                patient_name: 'Deepak Joshi',
                is_user: false,
                status: 'Waiting'
            }
        ]
    },

    orders: {}
};


// ====================================================
// USERS
// ====================================================

database.users = {};

database.users['doc_101'] = {
    id: 'doc_101',
    phone: '+919876543210',
    role: 'DOCTOR',
    name: 'Dr. Rajesh Kumar'
};

database.users['pat_789'] = {
    id: 'pat_789',
    phone: '+919876543211',
    role: 'PATIENT',
    name: 'Rahul Sharma'
};


// ====================================================
// CONSULTATIONS
// ====================================================
//
// IMPORTANT:
//
// Same consultationId
//      ↓
// Same Agora channel
//
// Doctor
//      ↓
// Stable UID + Token
//
// Patient
//      ↓
// Different stable UID + Token
//
// This is what makes both users enter the SAME call.
//

database.consultations = {};


// ====================================================
// AGORA PARTICIPANTS
// ====================================================
//
// consultationId + userId
//          ↓
// stable Agora UID
//
// UID kabhi random change nahi hoga.
//

database.agoraParticipants = {};


// ====================================================
// ACCESS TOKEN
// ====================================================

function createAccessToken(user) {

    if (!jwt) {
        throw new Error(
            'jsonwebtoken package is not installed.'
        );
    }

    if (!JWT_SECRET) {
        throw new Error(
            'JWT_SECRET is not configured.'
        );
    }

    return jwt.sign(
        {
            sub: user.id,
            role: user.role,
            phone: user.phone
        },

        JWT_SECRET,

        {
            expiresIn: ACCESS_TOKEN_TTL
        }
    );
}


// ====================================================
// AUTH MIDDLEWARE
// ====================================================

function authenticate(req, res, next) {

    try {

        const authorization =
            req.headers.authorization || '';

        if (!authorization.startsWith('Bearer ')) {

            return res.status(401).json({
                success: false,
                message:
                    'Authorization Bearer token is required.'
            });
        }

        if (!jwt || !JWT_SECRET) {

            return res.status(503).json({
                success: false,
                message:
                    'Authentication service is not configured.'
            });
        }

        const accessToken =
            authorization.substring(7).trim();

        const payload =
            jwt.verify(
                accessToken,
                JWT_SECRET
            );

        const user =
            database.users[payload.sub];

        if (!user) {

            return res.status(401).json({
                success: false,
                message:
                    'Authenticated user not found.'
            });
        }

        if (user.role !== payload.role) {

            return res.status(401).json({
                success: false,
                message:
                    'Invalid authentication role.'
            });
        }

        req.user = user;

        next();

    } catch (error) {

        console.error(
            '[AUTH] Authentication failed:',
            error.message
        );

        return res.status(401).json({
            success: false,
            message:
                'Invalid or expired access token.'
        });
    }
}


// ====================================================
// CONSULTATION CREATION
// ====================================================

function createConsultationIfMissing(
    consultationId,
    doctorId = 'doc_101',
    patientId = 'pat_789'
) {

    if (
        !consultationId ||
        consultationId.length > 128
    ) {
        throw new Error(
            'Invalid consultation ID.'
        );
    }

    let consultation =
        database.consultations[consultationId];

    if (!consultation) {

        const safeId =
            consultationId.replace(
                /[^a-zA-Z0-9_-]/g,
                '_'
            );

        const channelName =
            `vandycins_${safeId}_${crypto
                .randomBytes(4)
                .toString('hex')}`;

        consultation =
            database.consultations[consultationId] = {

                id: consultationId,

                doctorId,

                patientId,

                channelName,

                status: 'ACTIVE',

                createdAt:
                    new Date().toISOString()
            };
    }

    return consultation;
}


// ====================================================
// CONSULTATION AUTHORIZATION
// ====================================================

function assertConsultationParticipant(
    consultation,
    user
) {

    const isDoctor =
        user.role === 'DOCTOR' &&
        user.id === consultation.doctorId;

    const isPatient =
        user.role === 'PATIENT' &&
        user.id === consultation.patientId;

    if (!isDoctor && !isPatient) {

        const error =
            new Error(
                'You are not a participant of this consultation.'
            );

        error.statusCode = 403;

        throw error;
    }
}


// ====================================================
// STABLE AGORA UID
// ====================================================

function getStableAgoraUid(
    consultationId,
    user
) {

    const key =
        `${consultationId}:${user.id}`;

    const existing =
        database.agoraParticipants[key];

    if (existing) {
        return existing.uid;
    }

    const digest =
        crypto
            .createHash('sha256')
            .update(key)
            .digest();

    let uid =
        digest.readUInt32BE(0) &
        0x7fffffff;

    if (uid === 0) {
        uid = 1;
    }

    database.agoraParticipants[key] = {

        uid,

        consultationId,

        userId: user.id,

        role: user.role
    };

    return uid;
}


// ====================================================
// AGORA CONFIG VALIDATION
// ====================================================
function requireAgoraConfig() {

    if (!AGORA_APP_ID) {

        throw new Error(
            'Agora App ID is not configured.'
        );
    }

    if (!AGORA_APP_CERTIFICATE) {

        throw new Error(
            'Agora App Certificate is not configured.'
        );
    }

    if (!RtcTokenBuilder || !RtcRole) {

        throw new Error(
            'agora-token package is not available.'
        );
    }
}

// ====================================================
// AGORA RTC TOKEN
// ====================================================

function generateAgoraToken(
    channelName,
    uid
) {

    requireAgoraConfig();

    const role =
        RtcRole.PUBLISHER;

    const currentTimestamp =
        Math.floor(Date.now() / 1000);

    const privilegeExpiredTs =
        currentTimestamp +
        AGORA_TOKEN_TTL_SECONDS;

    return RtcTokenBuilder.buildTokenWithUid(

        AGORA_APP_ID,

        AGORA_APP_CERTIFICATE,

        channelName,

        uid,

        role,

        privilegeExpiredTs
    );
}


// ====================================================
// DOCTOR LOOKUP
// ====================================================

function getDoctorForConsultation(
    consultation
) {

    return (
        database.doctors.find(
            doctor =>
                doctor.id ===
                consultation.doctorId
        )
        ||
        database.doctors[0]
    );
}


// ====================================================
// HEALTH CHECK
// ====================================================

app.get('/health', (req, res) => {

    res.json({

        status: 'ok',

        service:
            'Telehealth Agora Backend API',

        version: '2.0.0',

        agoraAppIdConfigured:
            Boolean(AGORA_APP_ID),

        agoraCertificateConfigured:
            Boolean(AGORA_APP_CERTIFICATE),

        tokenGeneratorAvailable:
            Boolean(
                RtcTokenBuilder &&
                RtcRole
            ),

        authenticationConfigured:
            Boolean(
                jwt &&
                JWT_SECRET
            )
    });
});


// ====================================================
// AUTH — SEND OTP
// ====================================================

// ====================================================
// AUTH — SEND OTP
// ====================================================

app.post(
    '/v1/auth/send-otp',
    async (req, res) => {

        try {

            const rawPhone =
                String(
                    req.body?.phone || ''
                ).trim();

            const role =
                String(
                    req.body?.role || ''
                )
                    .trim()
                    .toUpperCase();

            const phone =
                normalizeIndianPhone(
                    rawPhone
                );

            // ------------------------------------------------
            // PHONE VALIDATION
            // ------------------------------------------------

            if (!phone) {

                return res.status(400).json({
                    success: false,
                    message:
                        'Valid mobile number is required.'
                });
            }

            // ------------------------------------------------
            // ROLE VALIDATION
            // ------------------------------------------------

            if (
                !['DOCTOR', 'PATIENT']
                    .includes(role)
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        'Role must be DOCTOR or PATIENT.'
                });
            }

            // ------------------------------------------------
            // USER MUST ALREADY EXIST
            // NO SIGNUP
            // ------------------------------------------------

            const user =
                findUserByPhoneAndRole(
                    phone,
                    role
                );

            if (!user) {

                return res.status(401).json({
                    success: false,
                    message:
                        'This mobile number is not registered for the selected role.'
                });
            }

            // ------------------------------------------------
            // RESEND COOLDOWN
            // ------------------------------------------------

            const key =
                `${phone}:${role}`;

            const existing =
                otpStore.get(key);

            if (
                existing &&
                Date.now() -
                existing.lastSentAt <
                OTP_COOLDOWN_MS
            ) {

                const remaining =
                    Math.ceil(
                        (
                            OTP_COOLDOWN_MS -
                            (
                                Date.now() -
                                existing.lastSentAt
                            )
                        ) / 1000
                    );

                return res.status(429).json({
                    success: false,
                    message:
                        'Please wait before requesting another OTP.',
                    cooldown_seconds:
                        remaining
                });
            }

            // ------------------------------------------------
            // GENERATE 4 DIGIT OTP
            // ------------------------------------------------

            const otp =
                generateOtp();

            const otpHash =
                hashOtp(otp);

            const requestId =
                `req_${Date.now()}_${crypto
                    .randomBytes(6)
                    .toString('hex')}`;

            // ------------------------------------------------
            // STORE OTP
            // ------------------------------------------------

            otpStore.set(
                key,
                {
                    phone,
                    role,
                    userId: user.id,
                    otpHash,
                    requestId,
                    createdAt: Date.now(),
                    expiresAt:
                        Date.now() +
                        OTP_EXPIRY_MS,
                    lastSentAt: Date.now(),
                    attempts: 0
                }
            );

            // ------------------------------------------------
            // SEND OTP
            // ------------------------------------------------

            await sendOtpSms({
                phone,
                otp,
                role
            });

            console.log(
                `[AUTH] OTP generated ` +
                `user=${user.id} ` +
                `role=${role} ` +
                `request=${requestId}`
            );

            // ------------------------------------------------
            // NEVER RETURN OTP TO ANDROID
            // ------------------------------------------------

            return res.status(200).json({
                success: true,
                message:
                    'OTP sent successfully.',
                request_id:
                    requestId,
                cooldown_seconds: 45
            });

        } catch (error) {

            console.error(
                '[AUTH] SEND OTP FAILED:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    error.message ||
                    'Unable to send OTP.'
            });
        }
    }
);
// ====================================================
// AUTH — VERIFY OTP
// ====================================================

// ====================================================
// AUTH — VERIFY OTP
// ====================================================

app.post(
    '/v1/auth/verify-otp',
    (req, res) => {

        try {

            const rawPhone =
                String(
                    req.body?.phone || ''
                ).trim();

            const otp =
                String(
                    req.body?.otp || ''
                ).trim();

            const role =
                String(
                    req.body?.role || ''
                )
                    .trim()
                    .toUpperCase();

            const phone =
                normalizeIndianPhone(
                    rawPhone
                );

            // ------------------------------------------------
            // PHONE
            // ------------------------------------------------

            if (!phone) {

                return res.status(400).json({
                    success: false,
                    message:
                        'Valid mobile number is required.'
                });
            }

            // ------------------------------------------------
            // ROLE
            // ------------------------------------------------

            if (
                !['DOCTOR', 'PATIENT']
                    .includes(role)
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        'Role must be DOCTOR or PATIENT.'
                });
            }

            // ------------------------------------------------
            // EXACTLY 4 DIGITS
            // ------------------------------------------------

            if (!/^\d{4}$/.test(otp)) {

                return res.status(400).json({
                    success: false,
                    message:
                        'OTP must be exactly 4 digits.'
                });
            }

            // ------------------------------------------------
            // FIND USER
            // ------------------------------------------------

            const user =
                findUserByPhoneAndRole(
                    phone,
                    role
                );

            if (!user) {

                return res.status(401).json({
                    success: false,
                    message:
                        'This mobile number is not registered for the selected role.'
                });
            }

            const key =
                `${phone}:${role}`;

            const storedOtp =
                otpStore.get(key);

            // ------------------------------------------------
            // OTP DOES NOT EXIST
            // ------------------------------------------------

            if (!storedOtp) {

                return res.status(401).json({
                    success: false,
                    message:
                        'OTP not found or expired. Please request a new OTP.'
                });
            }

            // ------------------------------------------------
            // USER BINDING
            // ------------------------------------------------

            if (
                storedOtp.userId !==
                user.id
            ) {

                otpStore.delete(key);

                return res.status(401).json({
                    success: false,
                    message:
                        'Invalid OTP request.'
                });
            }

            // ------------------------------------------------
            // EXPIRY
            // ------------------------------------------------

            if (
                Date.now() >
                storedOtp.expiresAt
            ) {

                otpStore.delete(key);

                return res.status(401).json({
                    success: false,
                    message:
                        'OTP has expired. Please request a new OTP.'
                });
            }

            // ------------------------------------------------
            // ATTEMPT LIMIT
            // ------------------------------------------------

            if (
                storedOtp.attempts >=
                OTP_MAX_ATTEMPTS
            ) {

                otpStore.delete(key);

                return res.status(429).json({
                    success: false,
                    message:
                        'Too many incorrect OTP attempts. Please request a new OTP.'
                });
            }

            // ------------------------------------------------
            // HASH PROVIDED OTP
            // ------------------------------------------------

            const providedHash =
                hashOtp(otp);

            const storedHash =
                storedOtp.otpHash;

            const hashesMatch =
                crypto.timingSafeEqual(
                    Buffer.from(
                        providedHash,
                        'hex'
                    ),
                    Buffer.from(
                        storedHash,
                        'hex'
                    )
                );

            // ------------------------------------------------
            // WRONG OTP
            // ------------------------------------------------

            if (!hashesMatch) {

                storedOtp.attempts += 1;

                const remaining =
                    OTP_MAX_ATTEMPTS -
                    storedOtp.attempts;

                if (
                    storedOtp.attempts >=
                    OTP_MAX_ATTEMPTS
                ) {

                    otpStore.delete(key);

                    return res.status(429).json({
                        success: false,
                        message:
                            'Too many incorrect OTP attempts. Please request a new OTP.'
                    });
                }

                return res.status(401).json({
                    success: false,
                    message:
                        'Invalid OTP.',
                    remaining_attempts:
                        remaining
                });
            }

            // ------------------------------------------------
            // OTP SUCCESS
            // ------------------------------------------------

            otpStore.delete(key);

            // ------------------------------------------------
            // CREATE ACCESS TOKEN
            // ------------------------------------------------

            const accessToken =
                createAccessToken(
                    user
                );

            const refreshToken =
                `refresh_${crypto
                    .randomBytes(32)
                    .toString('hex')}`;

            console.log(
                `[AUTH] LOGIN SUCCESS ` +
                `user=${user.id} ` +
                `role=${user.role} ` +
                `phone=${phone}`
            );

            return res.status(200).json({

                success: true,

                access_token:
                    accessToken,

                refresh_token:
                    refreshToken,

                user_id:
                    user.id,

                name:
                    user.name,

                phone:
                    user.phone,

                role:
                    user.role
            });

        } catch (error) {

            console.error(
                '[AUTH] VERIFY OTP FAILED:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Unable to verify OTP.'
            });
        }
    }
);

// ====================================================
// AUTH — REFRESH TOKEN
// ====================================================

app.post(
    '/v1/auth/refresh-token',
    authenticate,
    (req, res) => {

        const accessToken =
            createAccessToken(
                req.user
            );

        return res.json({

            access_token:
                accessToken,

            refresh_token:
                `refresh_${crypto
                    .randomBytes(32)
                    .toString('hex')}`
        });
    }
);


// ====================================================
// AUTH — LOGOUT
// ====================================================

app.post(
    '/v1/auth/logout',
    authenticate,
    (req, res) => {

        /*
         * For complete production security,
         * refresh tokens should be stored and
         * revoked in DB/Redis.
         */

        return res
            .status(200)
            .send();
    }
);


// ====================================================
// AGORA VIDEO CONSULTATION
// JOIN
// ====================================================

app.post(
    '/v1/consultations/:consultationId/join',
    authenticate,
    (req, res) => {

        try {

            const consultationId =
                String(
                    req.params.consultationId || ''
                ).trim();

            if (!consultationId) {

                return res.status(400).json({

                    success: false,

                    message:
                        'Consultation ID is required.'
                });
            }


            // Create/fetch consultation
            const consultation =
                createConsultationIfMissing(
                    consultationId
                );


            // Verify doctor/patient
            assertConsultationParticipant(
                consultation,
                req.user
            );


            // Consultation must be active
            if (
                consultation.status !==
                'ACTIVE'
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        'This consultation is no longer active.'
                });
            }


            // Doctor information
            const doctor =
                getDoctorForConsultation(
                    consultation
                );


            // Stable UID
            const uid =
                getStableAgoraUid(
                    consultationId,
                    req.user
                );


            // Token for EXACT channel + UID
            const token =
                generateAgoraToken(
                    consultation.channelName,
                    uid
                );


            console.log(
                `[AGORA] JOIN ` +
                `consultation=${consultationId} ` +
                `user=${req.user.id} ` +
                `role=${req.user.role} ` +
                `channel=${consultation.channelName} ` +
                `uid=${uid}`
            );


            return res.json({

                appId:
                    AGORA_APP_ID,

                channelName:
                    consultation.channelName,

                token,

                uid,

                doctorId:
                    doctor.id,

                doctorName:
                    doctor.name,

                specialty:
                    doctor.specialty
            });


        } catch (error) {

            console.error(
                '[AGORA] JOIN FAILED:',
                error
            );

            return res.status(
                error.statusCode || 500
            ).json({

                success: false,

                message:
                    error.message ||
                    'Unable to join consultation.'
            });
        }
    }
);


// ====================================================
// AGORA VIDEO CONSULTATION
// RENEW TOKEN
// ====================================================

app.post(
    '/v1/consultations/:consultationId/renew-token',
    authenticate,
    (req, res) => {

        try {

            const consultationId =
                String(
                    req.params.consultationId || ''
                ).trim();


            const consultation =
                database.consultations[
                    consultationId
                ];


            if (!consultation) {

                return res.status(404).json({

                    success: false,

                    message:
                        'Consultation not found.'
                });
            }


            // Verify participant
            assertConsultationParticipant(
                consultation,
                req.user
            );


            if (
                consultation.status !==
                'ACTIVE'
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        'This consultation is no longer active.'
                });
            }


            // SAME UID as original join
            const uid =
                getStableAgoraUid(
                    consultationId,
                    req.user
                );


            // Fresh token for SAME channel + UID
            const token =
                generateAgoraToken(
                    consultation.channelName,
                    uid
                );


            console.log(
                `[AGORA] RENEW ` +
                `consultation=${consultationId} ` +
                `user=${req.user.id} ` +
                `uid=${uid}`
            );


            return res.json({

                token,

                uid,

                channelName:
                    consultation.channelName
            });


        } catch (error) {

            console.error(
                '[AGORA] TOKEN RENEW FAILED:',
                error
            );

            return res.status(
                error.statusCode || 500
            ).json({

                success: false,

                message:
                    error.message ||
                    'Unable to renew Agora token.'
            });
        }
    }
);


// ====================================================
// END CONSULTATION
// ====================================================

app.post(
    '/v1/consultations/end',
    authenticate,
    (req, res) => {

        const consultationId =
            String(
                req.body.consultation_id || ''
            ).trim();

        const durationSeconds =
            Number(
                req.body.duration_seconds || 0
            );


        const consultation =
            database.consultations[
                consultationId
            ];


        if (!consultation) {

            return res.status(404).json({

                success: false,

                message:
                    'Consultation not found.'
            });
        }


        try {

            assertConsultationParticipant(
                consultation,
                req.user
            );

        } catch (error) {

            return res.status(
                error.statusCode || 403
            ).json({

                success: false,

                message:
                    error.message
            });
        }


        consultation.status =
            'ENDED';

        consultation.endedAt =
            new Date().toISOString();

        consultation.durationSeconds =
            Math.max(
                0,
                durationSeconds
            );


        console.log(
            `[AGORA] END ` +
            `consultation=${consultationId} ` +
            `user=${req.user.id} ` +
            `duration=${consultation.durationSeconds}s`
        );


        return res
            .status(200)
            .send();
    }
);

// ====================================================
// SERVER START
// ====================================================

app.listen(
    PORT,
    '0.0.0.0',
    () => {

        console.log(
            '===================================================='
        );

        console.log(
            `Telehealth API & Agora RTC Server running on :${PORT}`
        );

        console.log(
            `Agora App ID configured: ${Boolean(AGORA_APP_ID)}`
        );

        console.log(
            `Agora Certificate configured: ${Boolean(AGORA_APP_CERTIFICATE)}`
        );

        console.log(
            `Base URL: http://localhost:${PORT}/v1/`
        );

        console.log(
            `Health Check: http://localhost:${PORT}/health`
        );

        console.log(
            '===================================================='
        );
    }
);