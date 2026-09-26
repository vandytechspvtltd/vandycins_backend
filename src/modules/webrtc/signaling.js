const jwt = require('jsonwebtoken');
const config = require('../../config/env');
const database = require('../../database/database');
const webrtcService = require('./webrtc.service');

const SIGNAL_EVENTS = [
    { event: 'webrtc:offer', field: 'description', type: 'offer', maxLength: 100000 },
    { event: 'webrtc:answer', field: 'description', type: 'answer', maxLength: 100000 },
    { event: 'webrtc:ice-candidate', field: 'candidate', type: null, maxLength: 16000 }
];

function roomName(appointmentId) {
    return `appointment:${appointmentId}`;
}

function reply(acknowledge, result) {
    if (typeof acknowledge === 'function') acknowledge(result);
}

function validSignal(signal, field, type, maxLength) {
    if (!signal || typeof signal !== 'object' || Array.isArray(signal)) return false;
    if (type && signal.type !== type) return false;
    const size = JSON.stringify(signal).length;
    if (size > maxLength) return false;
    if (field === 'description') return typeof signal.sdp === 'string' && signal.sdp.length <= maxLength;
    return typeof signal.candidate === 'string' && signal.candidate.length <= maxLength;
}

function attachWebRtcSignaling(io) {
    io.use((socket, next) => {
        try {
            const token = String(socket.handshake.auth?.token || '').replace(/^Bearer\s+/i, '').trim();
            if (!token || !config.jwtAccessSecret) return next(new Error('Authentication required.'));
            const payload = jwt.verify(token, config.jwtAccessSecret);
            const user = database.users[payload.sub];
            if (payload.tokenType !== 'access' || !user || user.role !== payload.role || !['PATIENT', 'DOCTOR'].includes(user.role)) {
                return next(new Error('Invalid user credentials.'));
            }
            if (user.role === 'DOCTOR' && (user.isActive === false || user.status === 'PENDING')) {
                return next(new Error('Doctor account is not active.'));
            }
            socket.data.user = { id: user.id, role: user.role };
            return next();
        } catch {
            return next(new Error('Invalid or expired access token.'));
        }
    });

    io.on('connection', socket => {
        const joinedAppointments = new Set();

        socket.on('webrtc:join', async (payload = {}, acknowledge) => {
            const appointmentId = String(payload.appointmentId || '').trim();
            const appointment = webrtcService.appointmentForParticipant(socket.data.user, appointmentId);
            if (!appointment) return reply(acknowledge, { ok: false, error: 'Call not available for this appointment.' });

            const room = roomName(appointmentId);
            await socket.join(room);
            joinedAppointments.add(appointmentId);
            socket.to(room).emit('webrtc:peer-joined', {
                appointmentId,
                userId: socket.data.user.id,
                role: socket.data.user.role
            });
            return reply(acknowledge, { ok: true, appointmentId });
        });

        for (const { event, field, type, maxLength } of SIGNAL_EVENTS) {
            socket.on(event, (payload = {}, acknowledge) => {
                const appointmentId = String(payload.appointmentId || '').trim();
                const appointment = webrtcService.appointmentForParticipant(socket.data.user, appointmentId);
                if (!joinedAppointments.has(appointmentId) || !appointment) {
                    return reply(acknowledge, { ok: false, error: 'Join this appointment before sending call signals.' });
                }
                if (!validSignal(payload[field], field, type, maxLength)) {
                    return reply(acknowledge, { ok: false, error: 'Invalid call signal.' });
                }

                socket.to(roomName(appointmentId)).emit(event, {
                    appointmentId,
                    fromUserId: socket.data.user.id,
                    [field]: payload[field]
                });
                return reply(acknowledge, { ok: true });
            });
        }

        socket.on('webrtc:leave', async (payload = {}, acknowledge) => {
            const appointmentId = String(payload.appointmentId || '').trim();
            if (!joinedAppointments.delete(appointmentId)) {
                return reply(acknowledge, { ok: false, error: 'You have not joined this appointment.' });
            }
            const room = roomName(appointmentId);
            await socket.leave(room);
            socket.to(room).emit('webrtc:peer-left', { appointmentId, userId: socket.data.user.id });
            return reply(acknowledge, { ok: true });
        });

        socket.on('disconnect', () => {
            for (const appointmentId of joinedAppointments) {
                socket.to(roomName(appointmentId)).emit('webrtc:peer-left', {
                    appointmentId,
                    userId: socket.data.user.id
                });
            }
        });
    });
}

module.exports = attachWebRtcSignaling;