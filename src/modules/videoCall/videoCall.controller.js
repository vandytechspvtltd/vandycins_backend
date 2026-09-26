const { sendError } = require('../../utils/response');
const videoCallService = require('./videoCall.service');
const validation = require('./videoCall.validation');

const RING_TIMEOUT_MS = 30000;

function appointmentId(req, res) {
    const id = req.params.appointmentId;
    if (!validation.isValidId(id)) {
        sendError(res, 400, 'A valid appointmentId is required.');
        return null;
    }
    return id.trim();
}

function handleError(res, error) {
    return sendError(res, error.statusCode || 500, error.message || 'Unable to process video call.');
}

function notify(io, userId, event, session) {
    io?.to(videoCallService.userRoom(userId)).emit(event, session);
}

function iceServers(req, res) {
    return res.json({ success: true, data: videoCallService.iceServerConfiguration() });
}

function start(req, res) {
    const id = appointmentId(req, res);
    if (!id) return;
    try {
        const session = videoCallService.startCall(req.user, id);
        const io = req.app.get('io');
        notify(io, session.doctorId, 'call:incoming', session);

        const timer = setTimeout(() => {
            const missedSession = videoCallService.markMissed(session.id);
            if (!missedSession) return;
            notify(io, missedSession.patientId, 'call:ended', missedSession);
            notify(io, missedSession.doctorId, 'call:ended', missedSession);
        }, RING_TIMEOUT_MS);
        timer.unref?.();

        return res.status(201).json({ success: true, data: session });
    } catch (error) {
        return handleError(res, error);
    }
}

function accept(req, res) {
    const id = appointmentId(req, res);
    if (!id) return;
    try {
        const session = videoCallService.acceptCall(req.user, id);
        return res.json({ success: true, data: session });
    } catch (error) {
        return handleError(res, error);
    }
}

function acceptSession(req, res) {
    const callSessionId = String(req.params.callSessionId || '').trim();
    if (!validation.isValidCallSessionId(callSessionId)) return sendError(res, 400, 'A valid callSessionId is required.');
    try {
        const session = videoCallService.acceptCallSession(req.user, callSessionId);
        return res.json({ success: true, data: session });
    } catch (error) {
        return handleError(res, error);
    }
}

function reject(req, res) {
    const id = appointmentId(req, res);
    if (!id) return;
    try {
        const session = videoCallService.rejectCall(req.user, id);
        const io = req.app.get('io');
        notify(io, session.patientId, 'call:rejected', session);
        notify(io, session.doctorId, 'call:rejected', session);
        return res.json({ success: true, data: session });
    } catch (error) {
        return handleError(res, error);
    }
}

function rejectSession(req, res) {
    const callSessionId = String(req.params.callSessionId || '').trim();
    if (!validation.isValidCallSessionId(callSessionId)) return sendError(res, 400, 'A valid callSessionId is required.');
    try {
        const session = videoCallService.rejectCallSession(req.user, callSessionId);
        const io = req.app.get('io');
        notify(io, session.patientId, 'call:rejected', session);
        notify(io, session.doctorId, 'call:rejected', session);
        return res.json({ success: true, data: session });
    } catch (error) {
        return handleError(res, error);
    }
}

function end(req, res) {
    const id = appointmentId(req, res);
    if (!id) return;
    try {
        const session = videoCallService.endCall(req.user, id);
        const io = req.app.get('io');
        notify(io, session.patientId, 'call:ended', session);
        notify(io, session.doctorId, 'call:ended', session);
        return res.json({ success: true, data: session });
    } catch (error) {
        return handleError(res, error);
    }
}

function endSession(req, res) {
    const callSessionId = String(req.params.callSessionId || '').trim();
    if (!validation.isValidCallSessionId(callSessionId)) return sendError(res, 400, 'A valid callSessionId is required.');
    try {
        const session = videoCallService.endCallSession(req.user, callSessionId);
        const io = req.app.get('io');
        notify(io, session.patientId, 'call:ended', session);
        notify(io, session.doctorId, 'call:ended', session);
        return res.json({ success: true, data: session });
    } catch (error) {
        return handleError(res, error);
    }
}

function get(req, res) {
    const id = appointmentId(req, res);
    if (!id) return;
    try {
        return res.json({ success: true, data: videoCallService.getCall(req.user, id) });
    } catch (error) {
        return handleError(res, error);
    }
}

module.exports = { iceServers, start, accept, acceptSession, reject, rejectSession, end, endSession, get };