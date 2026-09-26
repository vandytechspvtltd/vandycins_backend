const crypto = require('crypto');
const config = require('../../config/env');
const database = require('../../database/database');

const CALL_STATUSES = new Set(['RINGING', 'ACCEPTED', 'ACTIVE', 'REJECTED', 'MISSED', 'ENDED']);
const ACTIVE_STATUSES = new Set(['RINGING', 'ACCEPTED', 'ACTIVE']);
const ALLOWED_TRANSITIONS = {
    RINGING: new Set(['ACCEPTED', 'REJECTED', 'MISSED']),
    ACCEPTED: new Set(['ACTIVE', 'ENDED']),
    ACTIVE: new Set(['ENDED']),
    REJECTED: new Set(),
    MISSED: new Set(),
    ENDED: new Set()
};

function callError(statusCode, message, code) {
    return Object.assign(new Error(message), { statusCode, code });
}

function appointmentById(appointmentId) {
    return database.appointments.find(item => item.id === appointmentId) || null;
}

function assertAppointmentParticipant(appointment, user, role) {
    if (!appointment) throw callError(404, 'Appointment not found.', 'APPOINTMENT_NOT_FOUND');
    const matchingRole = user.role === role;
    const matchingUser = role === 'PATIENT'
        ? appointment.patientId === user.id
        : appointment.doctorId === user.id;
    if (!matchingRole || !matchingUser) {
        throw callError(403, `Only the appointment's ${role.toLowerCase()} can perform this action.`, `UNAUTHORIZED_${role}`);
    }
}

function latestSession(appointmentId) {
    return database.callSessions.filter(session => session.appointmentId === appointmentId).at(-1) || null;
}

function sessionById(callSessionId) {
    return database.callSessions.find(session => session.id === callSessionId) || null;
}

function assertSessionParticipant(session, user) {
    if (!session) throw callError(404, 'Call not found.', 'CALL_NOT_FOUND');
    const appointment = appointmentById(session.appointmentId);
    if (!appointment) throw callError(404, 'Appointment not found.', 'APPOINTMENT_NOT_FOUND');
    if (session.patientId !== appointment.patientId || session.doctorId !== appointment.doctorId) {
        throw callError(404, 'Call not found.', 'CALL_NOT_FOUND');
    }
    const isPatient = user.role === 'PATIENT' && session.patientId === user.id;
    const isDoctor = user.role === 'DOCTOR' && session.doctorId === user.id;
    if (!isPatient && !isDoctor) throw callError(403, 'You are not authorized for this call.', 'UNAUTHORIZED_CALL');
    return appointment;
}

function transition(session, nextStatus, now = new Date().toISOString()) {
    if (!CALL_STATUSES.has(nextStatus) || !ALLOWED_TRANSITIONS[session.status]?.has(nextStatus)) {
        throw callError(409, `Invalid call status transition: ${session.status} -> ${nextStatus}.`, 'INVALID_STATUS_TRANSITION');
    }
    session.status = nextStatus;
    if (nextStatus === 'ACTIVE') session.startedAt = now;
    if (['REJECTED', 'MISSED', 'ENDED'].includes(nextStatus)) session.endedAt = now;
    return session;
}

function startCall(user, appointmentId) {
    const appointment = appointmentById(appointmentId);
    assertAppointmentParticipant(appointment, user, 'PATIENT');

    if (database.callSessions.some(session => session.appointmentId === appointmentId && ACTIVE_STATUSES.has(session.status))) {
        throw callError(409, 'An active call already exists for this appointment.', 'ACTIVE_CALL_EXISTS');
    }

    const now = new Date().toISOString();
    const session = {
        id: `call_${crypto.randomUUID()}`,
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        status: 'RINGING',
        startedAt: null,
        endedAt: null,
        createdAt: now
    };
    database.callSessions.push(session);
    return session;
}

function sessionForAppointment(user, appointmentId) {
    const appointment = appointmentById(appointmentId);
    if (!appointment) throw callError(404, 'Appointment not found.', 'APPOINTMENT_NOT_FOUND');
    const isPatient = user.role === 'PATIENT' && appointment.patientId === user.id;
    const isDoctor = user.role === 'DOCTOR' && appointment.doctorId === user.id;
    if (!isPatient && !isDoctor) throw callError(403, 'You are not authorized for this appointment.', 'UNAUTHORIZED_APPOINTMENT');
    const session = latestSession(appointment.id);
    if (!session) throw callError(404, 'Call not found.', 'CALL_NOT_FOUND');
    if (session.appointmentId !== appointment.id) throw callError(404, 'Call not found.', 'CALL_NOT_FOUND');
    return session;
}

function acceptCall(user, appointmentId) {
    const appointment = appointmentById(appointmentId);
    assertAppointmentParticipant(appointment, user, 'DOCTOR');
    const session = sessionForAppointment(user, appointmentId);
    return transition(session, 'ACCEPTED');
}

function rejectCall(user, appointmentId) {
    const appointment = appointmentById(appointmentId);
    assertAppointmentParticipant(appointment, user, 'DOCTOR');
    const session = sessionForAppointment(user, appointmentId);
    return transition(session, 'REJECTED');
}

function endCall(user, appointmentId) {
    const appointment = appointmentById(appointmentId);
    if (!appointment) throw callError(404, 'Appointment not found.', 'APPOINTMENT_NOT_FOUND');
    const session = sessionForAppointment(user, appointmentId);
    assertSessionParticipant(session, user);
    return transition(session, 'ENDED');
}

function getCall(user, appointmentId) {
    const appointment = appointmentById(appointmentId);
    if (!appointment) throw callError(404, 'Appointment not found.', 'APPOINTMENT_NOT_FOUND');
    const session = sessionForAppointment(user, appointmentId);
    assertSessionParticipant(session, user);
    return session;
}

function sessionForSocket(user, callSessionId) {
    const session = sessionById(callSessionId);
    assertSessionParticipant(session, user);
    return session;
}

function activateCall(session) {
    if (session.status === 'ACTIVE') return session;
    return transition(session, 'ACTIVE');
}

function rejectCallSession(user, callSessionId) {
    const session = sessionForSocket(user, callSessionId);
    const appointment = appointmentById(session.appointmentId);
    assertAppointmentParticipant(appointment, user, 'DOCTOR');
    return transition(session, 'REJECTED');
}

function endCallSession(user, callSessionId) {
    const session = sessionForSocket(user, callSessionId);
    return transition(session, 'ENDED');
}

function markMissed(callSessionId) {
    const session = sessionById(callSessionId);
    if (!session || session.status !== 'RINGING') return null;
    return transition(session, 'MISSED');
}

function iceServerConfiguration() {
    const iceServers = [];
    if (config.webrtcStunUrls.length) iceServers.push({ urls: config.webrtcStunUrls });
    if (config.webrtcTurnUrl) {
        const turnServer = { urls: config.webrtcTurnUrl };
        if (config.webrtcTurnUsername && config.webrtcTurnCredential) {
            turnServer.username = config.webrtcTurnUsername;
            turnServer.credential = config.webrtcTurnCredential;
        }
        iceServers.push(turnServer);
    }
    return { iceServers };
}

function userRoom(userId) {
    return `user:${userId}`;
}

module.exports = {
    CALL_STATUSES,
    ACTIVE_STATUSES,
    callError,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    getCall,
    sessionForSocket,
    activateCall,
    rejectCallSession,
    endCallSession,
    markMissed,
    iceServerConfiguration,
    userRoom
};