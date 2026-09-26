const service = require('../doctor/doctor.service');
const { sendError } = require('../../utils/response');
const videoCallService = require('./videoCall.service');
const validation = require('./videoCall.validation');

const RING_TIMEOUT_MS = 30000;


// =====================================================
// COMMON HELPERS
// =====================================================

function appointmentId(req, res) {
    const id = req.params.appointmentId;

    if (!validation.isValidId(id)) {
        sendError(res, 400, 'A valid appointmentId is required.');
        return null;
    }

    return id.trim();
}

function handleError(res, error) {
    return sendError(
        res,
        error.statusCode || 500,
        error.message || 'Unable to process video call.'
    );
}

function notify(io, userId, event, session) {
    io?.to(videoCallService.userRoom(userId)).emit(event, session);
}


// =====================================================
// VIDEO CALL - GENERIC ROUTES
// =====================================================

function iceServers(req, res) {
    return res.json({
        success: true,
        data: videoCallService.iceServerConfiguration()
    });
}

function start(req, res) {
    const id = appointmentId(req, res);

    if (!id) return;

    try {
        const session = videoCallService.startCall(
            req.user,
            id
        );

        const io = req.app.get('io');

        // Notify doctor about incoming call
        notify(
            io,
            session.doctorId,
            'call:incoming',
            session
        );

        // Auto mark call as missed after ring timeout
        const timer = setTimeout(() => {
            const missedSession =
                videoCallService.markMissed(session.id);

            if (!missedSession) return;

            notify(
                io,
                missedSession.patientId,
                'call:ended',
                missedSession
            );

            notify(
                io,
                missedSession.doctorId,
                'call:ended',
                missedSession
            );
        }, RING_TIMEOUT_MS);

        timer.unref?.();

        return res.status(201).json({
            success: true,
            data: session
        });

    } catch (error) {
        return handleError(res, error);
    }
}

function accept(req, res) {
    const id = appointmentId(req, res);

    if (!id) return;

    try {
        const session = videoCallService.acceptCall(
            req.user,
            id
        );

        const io = req.app.get('io');

        notify(
            io,
            session.patientId,
            'call:accepted',
            session
        );

        return res.json({
            success: true,
            data: session
        });

    } catch (error) {
        return handleError(res, error);
    }
}

function reject(req, res) {
    const id = appointmentId(req, res);

    if (!id) return;

    try {
        const session = videoCallService.rejectCall(
            req.user,
            id
        );

        const io = req.app.get('io');

        notify(
            io,
            session.patientId,
            'call:rejected',
            session
        );

        notify(
            io,
            session.doctorId,
            'call:rejected',
            session
        );

        return res.json({
            success: true,
            data: session
        });

    } catch (error) {
        return handleError(res, error);
    }
}

function end(req, res) {
    const id = appointmentId(req, res);

    if (!id) return;

    try {
        const session = videoCallService.endCall(
            req.user,
            id
        );

        const io = req.app.get('io');

        notify(
            io,
            session.patientId,
            'call:ended',
            session
        );

        notify(
            io,
            session.doctorId,
            'call:ended',
            session
        );

        return res.json({
            success: true,
            data: session
        });

    } catch (error) {
        return handleError(res, error);
    }
}

function get(req, res) {
    const id = appointmentId(req, res);

    if (!id) return;

    try {
        const data = videoCallService.getCall(
            req.user,
            id
        );

        return res.json({
            success: true,
            data
        });

    } catch (error) {
        return handleError(res, error);
    }
}


// =====================================================
// DOCTOR AUTH
// =====================================================

function register(req, res) {
    const result = service.register(
        req.body || {}
    );

    if (result.error) {
        return res.status(result.error[0]).json({
            success: false,
            message: result.error[1]
        });
    }

    return res.status(201).json({
        success: true,
        message: 'Doctor registration submitted for admin review.',
        data: result.data
    });
}

function login(req, res) {
    const result = service.login(
        req.body?.email,
        req.body?.password
    );

    if (result.error) {
        return res.status(result.error[0]).json({
            success: false,
            message: result.error[1]
        });
    }

    return res.json({
        success: true,
        data: result.data,
        access_token: result.data.accessToken
    });
}


// =====================================================
// DOCTOR PROFILE
// =====================================================

function profile(req, res) {
    const data = service.getProfile(
        req.user.id
    );

    if (!data) {
        return res.status(404).json({
            success: false,
            message: 'Doctor profile not found.'
        });
    }

    return res.json({
        success: true,
        data
    });
}

function status(req, res) {
    const data = service.getStatus(
        req.user.id
    );

    if (!data) {
        return res.status(404).json({
            success: false,
            message: 'Doctor status not found.'
        });
    }

    return res.json({
        success: true,
        data
    });
}

function updateProfile(req, res) {
    const result = service.updateProfile(
        req.user.id,
        req.body || {}
    );

    if (result.error) {
        return res.status(result.error[0]).json({
            success: false,
            message: result.error[1]
        });
    }

    return res.json({
        success: true,
        message: 'Doctor profile updated successfully.',
        data: result.data
    });
}


// =====================================================
// DOCTOR APPOINTMENTS
// =====================================================

function appointments(req, res) {
    const result = service.getAppointments(
        req.user.id
    );

    if (result?.error) {
        return res.status(result.error[0]).json({
            success: false,
            message: result.error[1]
        });
    }

    return res.json({
        success: true,
        data: result || []
    });
}

function appointmentDetails(req, res) {
    const result = service.getAppointment(
        req.user.id,
        req.params.appointmentId
    );

    if (result?.error) {
        return res.status(result.error[0]).json({
            success: false,
            message: result.error[1]
        });
    }

    if (!result) {
        return res.status(404).json({
            success: false,
            message: 'Appointment not found.'
        });
    }

    return res.json({
        success: true,
        data: result
    });
}

function updateAppointmentStatus(req, res) {
    const result = service.updateAppointmentStatus(
        req.user.id,
        req.params.appointmentId,
        req.body?.status
    );

    if (result?.error) {
        return res.status(result.error[0]).json({
            success: false,
            message: result.error[1]
        });
    }

    if (!result) {
        return res.status(404).json({
            success: false,
            message: 'Appointment not found.'
        });
    }

    return res.json({
        success: true,
        message: 'Appointment status updated successfully.',
        data: result
    });
}


// =====================================================
// DOCTOR PATIENTS
// =====================================================

function patients(req, res) {
    const result = service.getPatients(
        req.user.id
    );

    if (result?.error) {
        return res.status(result.error[0]).json({
            success: false,
            message: result.error[1]
        });
    }

    return res.json({
        success: true,
        data: result || []
    });
}

function patientDetails(req, res) {
    const result = service.getPatient(
        req.user.id,
        req.params.patientId
    );

    if (result?.error) {
        return res.status(result.error[0]).json({
            success: false,
            message: result.error[1]
        });
    }

    if (!result) {
        return res.status(404).json({
            success: false,
            message: 'Patient not found.'
        });
    }

    return res.json({
        success: true,
        data: result
    });
}


// =====================================================
// DOCTOR PORTAL VIDEO CALL
// =====================================================

function getCall(req, res) {
    try {
        const data = videoCallService.getCall(
            req.user,
            req.params.appointmentId
        );

        return res.json({
            success: true,
            data
        });

    } catch (error) {
        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            message:
                error.message ||
                'Unable to get call.'
        });
    }
}

function acceptCall(req, res) {
    try {
        const data = videoCallService.acceptCall(
            req.user,
            req.params.appointmentId
        );

        const io = req.app.get('io');

        notify(
            io,
            data.patientId,
            'call:accepted',
            data
        );

        return res.json({
            success: true,
            message: 'Call accepted.',
            data
        });

    } catch (error) {
        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            message:
                error.message ||
                'Unable to accept call.'
        });
    }
}

function rejectCall(req, res) {
    try {
        const data = videoCallService.rejectCall(
            req.user,
            req.params.appointmentId
        );

        const io = req.app.get('io');

        notify(
            io,
            data.patientId,
            'call:rejected',
            data
        );

        notify(
            io,
            data.doctorId,
            'call:rejected',
            data
        );

        return res.json({
            success: true,
            message: 'Call rejected.',
            data
        });

    } catch (error) {
        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            message:
                error.message ||
                'Unable to reject call.'
        });
    }
}

function endCall(req, res) {
    try {
        const data = videoCallService.endCall(
            req.user,
            req.params.appointmentId
        );

        const io = req.app.get('io');

        notify(
            io,
            data.patientId,
            'call:ended',
            data
        );

        notify(
            io,
            data.doctorId,
            'call:ended',
            data
        );

        return res.json({
            success: true,
            message: 'Call ended.',
            data
        });

    } catch (error) {
        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            message:
                error.message ||
                'Unable to end call.'
        });
    }
}


// =====================================================
// EXPORTS
// =====================================================

module.exports = {

    // Generic Video Call
    iceServers,
    start,
    accept,
    reject,
    end,
    get,

    // Doctor Auth
    register,
    login,

    // Doctor Profile
    profile,
    status,
    updateProfile,

    // Doctor Appointments
    appointments,
    appointmentDetails,
    updateAppointmentStatus,

    // Doctor Patients
    patients,
    patientDetails,

    // Doctor Portal Video Call
    getCall,
    acceptCall,
    rejectCall,
    endCall
};