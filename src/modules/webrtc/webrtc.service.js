const crypto = require('crypto');
const config = require('../../config/env');
const database = require('../../database/database');

function iceServerConfiguration(userId, now = Math.floor(Date.now() / 1000)) {
    const iceServers = config.webrtcStunUrls.map(urls => ({ urls }));
    let expiresAt = null;

    if (config.webrtcTurnUrls.length && config.turnSharedSecret) {
        expiresAt = now + config.turnCredentialTtlSeconds;
        const username = `${expiresAt}:${userId}`;
        const credential = crypto.createHmac('sha1', config.turnSharedSecret).update(username).digest('base64');
        iceServers.push({ urls: config.webrtcTurnUrls, username, credential });
    }

    return { iceServers, expiresAt, turnConfigured: expiresAt !== null };
}

function appointmentForParticipant(user, appointmentId) {
    const appointment = database.appointments.find(item => item.id === appointmentId);
    if (!appointment || appointment.status !== 'CONFIRMED') return null;
    if (!['VIDEO', 'AUDIO'].includes(String(appointment.consultationType || '').toUpperCase())) return null;

    const payment = database.payments.find(item => item.appointmentId === appointment.id);
    if (payment?.status !== 'SUCCESS') return null;

    const isPatient = user.role === 'PATIENT' && appointment.patientId === user.id;
    const isDoctor = user.role === 'DOCTOR' && appointment.doctorId === user.id;
    if (!isPatient && !isDoctor) return null;
    if (isDoctor && (user.isActive === false || user.status === 'PENDING')) return null;

    return appointment;
}

module.exports = { iceServerConfiguration, appointmentForParticipant };