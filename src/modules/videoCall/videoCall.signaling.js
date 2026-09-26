const config = require('../../config/env');
const authenticate = require('../../middleware/authMiddleware');
const videoCallService = require('./videoCall.service');
const validation = require('./videoCall.validation');

function emitError(socket, message, callSessionId) {
    socket.emit('call:error', {
        ...(validation.isValidCallSessionId(callSessionId) ? { callSessionId } : {}),
        message
    });
}

function validPayload(payload) {
    return payload && typeof payload === 'object' && !Array.isArray(payload);
}

function attachVideoCallSignaling(io) {
    io.use((socket, next) => {
        try {
            const authorization = socket.handshake.auth?.token || socket.handshake.headers?.authorization || '';
            const token = String(authorization).replace(/^Bearer\s+/i, '').trim();
            if (!token || !config.jwtAccessSecret) return next(new Error('Invalid or expired access token.'));
            const user = authenticate.authenticateToken(token);
            if (!['PATIENT', 'DOCTOR'].includes(user.role)) return next(new Error('Invalid user role.'));
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
        const joinedSessions = new Set();
        socket.join(videoCallService.userRoom(socket.data.user.id));

        socket.on('call:join', async payload => {
            const callSessionId = payload?.callSessionId;
            if (!validPayload(payload) || !validation.isValidCallSessionId(callSessionId)) {
                return emitError(socket, 'Invalid callSessionId.', callSessionId);
            }
            try {
                const session = videoCallService.sessionForSocket(socket.data.user, callSessionId);
                if (!['ACCEPTED', 'ACTIVE'].includes(session.status)) {
                    return emitError(socket, `Call cannot be joined while it is ${session.status}.`, callSessionId);
                }

                await socket.join(session.id);
                joinedSessions.add(session.id);
                const peers = await io.in(session.id).fetchSockets();
                const joinedUsers = new Set(peers.map(peer => peer.data.user?.id));
                if (session.status === 'ACCEPTED' && joinedUsers.has(session.patientId) && joinedUsers.has(session.doctorId)) {
                    videoCallService.activateCall(session);
                }
                io.to(session.id).emit('call:joined', {
                    callSessionId: session.id,
                    userId: socket.data.user.id,
                    role: socket.data.user.role,
                    status: session.status
                });
            } catch (error) {
                emitError(socket, error.message || 'Unable to join this call.', callSessionId);
            }
        });

        async function forwardSignal(event, payload, validSignal, requiredRole) {
            const callSessionId = payload?.callSessionId;
            if (!validPayload(payload) || !validation.isValidCallSessionId(callSessionId)) {
                return emitError(socket, 'Invalid callSessionId.', callSessionId);
            }
            try {
                const session = videoCallService.sessionForSocket(socket.data.user, callSessionId);
                if (!joinedSessions.has(session.id)) {
                    return emitError(socket, 'Join this call before sending signaling data.', callSessionId);
                }
                if (session.status !== 'ACTIVE') {
                    return emitError(socket, `Call is not active (status: ${session.status}).`, callSessionId);
                }
                if (requiredRole && socket.data.user.role !== requiredRole) {
                    return emitError(socket, `Only the ${requiredRole.toLowerCase()} can send this signal.`, callSessionId);
                }
                if (!validSignal(payload)) return emitError(socket, 'Invalid signaling payload.', callSessionId);

                const peers = await io.in(session.id).fetchSockets();
                const otherUserId = socket.data.user.id === session.patientId ? session.doctorId : session.patientId;
                if (!peers.some(peer => peer.data.user?.id === otherUserId)) {
                    return emitError(socket, 'The other participant is disconnected.', callSessionId);
                }

                const { description, candidate } = payload;
                socket.to(session.id).emit(event, {
                    callSessionId: session.id,
                    fromUserId: socket.data.user.id,
                    ...(description !== undefined ? { description } : {}),
                    ...(candidate !== undefined ? { candidate } : {})
                });
            } catch (error) {
                emitError(socket, error.message || 'Unable to forward signaling data.', callSessionId);
            }
        }

        socket.on('call:offer', payload => forwardSignal(
            'call:offer', payload,
            value => validation.isValidDescription(value.description, 'offer'),
            'PATIENT'
        ));
        socket.on('call:answer', payload => forwardSignal(
            'call:answer', payload,
            value => validation.isValidDescription(value.description, 'answer'),
            'DOCTOR'
        ));
        socket.on('call:ice-candidate', payload => forwardSignal(
            'call:ice-candidate', payload,
            value => validation.isValidIceCandidate(value.candidate),
            null
        ));

        socket.on('call:reject', payload => {
            const callSessionId = payload?.callSessionId;
            if (!validPayload(payload) || !validation.isValidCallSessionId(callSessionId)) {
                return emitError(socket, 'Invalid callSessionId.', callSessionId);
            }
            try {
                const session = videoCallService.rejectCallSession(socket.data.user, callSessionId);
                io.to(videoCallService.userRoom(session.patientId)).emit('call:rejected', session);
                io.to(videoCallService.userRoom(session.doctorId)).emit('call:rejected', session);
            } catch (error) {
                emitError(socket, error.message || 'Unable to reject this call.', callSessionId);
            }
        });

        socket.on('call:end', payload => {
            const callSessionId = payload?.callSessionId;
            if (!validPayload(payload) || !validation.isValidCallSessionId(callSessionId)) {
                return emitError(socket, 'Invalid callSessionId.', callSessionId);
            }
            try {
                const session = videoCallService.endCallSession(socket.data.user, callSessionId);
                io.to(videoCallService.userRoom(session.patientId)).emit('call:ended', session);
                io.to(videoCallService.userRoom(session.doctorId)).emit('call:ended', session);
            } catch (error) {
                emitError(socket, error.message || 'Unable to end this call.', callSessionId);
            }
        });

        socket.on('disconnect', () => joinedSessions.clear());
    });
}

module.exports = attachVideoCallSignaling;