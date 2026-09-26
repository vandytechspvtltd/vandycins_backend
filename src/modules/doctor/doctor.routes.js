const express = require('express');

const controller = require('./doctor.controller');
const authenticate = require('../../middleware/authMiddleware');

const router = express.Router();


// =====================================================
// DOCTOR AUTH
// =====================================================

router.post(
    '/register',
    controller.register
);

router.post(
    '/login',
    controller.login
);


// =====================================================
// DOCTOR PROFILE
// =====================================================

router.get(
    '/profile',
    authenticate,
    controller.profile
);

router.patch(
    '/profile',
    authenticate,
    controller.updateProfile
);

router.get(
    '/status',
    authenticate,
    controller.status
);


// =====================================================
// APPOINTMENTS
// =====================================================

router.get(
    '/appointments',
    authenticate,
    controller.appointments
);

router.get(
    '/appointments/:appointmentId',
    authenticate,
    controller.appointmentDetails
);

router.patch(
    '/appointments/:appointmentId/status',
    authenticate,
    controller.updateAppointmentStatus
);


// =====================================================
// PATIENTS
// =====================================================

router.get(
    '/patients',
    authenticate,
    controller.patients
);

router.get(
    '/patients/:patientId',
    authenticate,
    controller.patientDetails
);


// =====================================================
// VIDEO CALL
// =====================================================

// Get current call for an appointment
router.get(
    '/appointments/:appointmentId/call',
    authenticate,
    controller.getCall
);

// Doctor accepts incoming call
router.post(
    '/appointments/:appointmentId/call/accept',
    authenticate,
    controller.acceptCall
);

// Doctor rejects incoming call
router.post(
    '/appointments/:appointmentId/call/reject',
    authenticate,
    controller.rejectCall
);

// Doctor ends call
router.post(
    '/appointments/:appointmentId/call/end',
    authenticate,
    controller.endCall
);


module.exports = router;