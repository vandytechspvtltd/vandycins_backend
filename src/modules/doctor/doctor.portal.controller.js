const doctorService = require('./doctor.service');
const database = require('../../database/database');

function isDoctorAllowed(req) {
    if (!req.user || req.user.role !== 'DOCTOR') return false;
    const registration = database.doctorRegistrations.find(item => item.userId === req.user.id);
    return Boolean(registration && registration.status === 'APPROVED' && registration.isActive !== false);
}

function profile(req, res) {
    if (!isDoctorAllowed(req)) {
        return res.status(403).json({ success: false, message: 'Doctor account is not approved or active.' });
    }
    const profile = doctorService.getProfile(req.user.id);
    if (!profile) return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    return res.json({ success: true, data: { doctor: profile } });
}

function updateProfile(req, res) {
    if (!isDoctorAllowed(req)) {
        return res.status(403).json({ success: false, message: 'Doctor account is not approved or active.' });
    }
    const result = doctorService.updateProfile(req.user.id, req.body || {});
    if (result.error) return res.status(result.error[0]).json({ success: false, message: result.error[1] });
    return res.json({ success: true, data: { doctor: result.data } });
}

function status(req, res) {
    if (!isDoctorAllowed(req)) {
        return res.status(403).json({ success: false, message: 'Doctor account is not approved or active.' });
    }
    const data = doctorService.getStatus(req.user.id);
    if (!data) return res.status(404).json({ success: false, message: 'Doctor status not found.' });
    return res.json({ success: true, data: { doctorId: data.doctorId, status: data.status, active: data.active } });
}

function appointments(req, res) {
    if (!isDoctorAllowed(req)) {
        return res.status(403).json({ success: false, message: 'Doctor account is not approved or active.' });
    }
    return res.json({ success: true, data: doctorService.getDoctorAppointments(req.user.id) });
}

function appointmentDetails(req, res) {
    if (!isDoctorAllowed(req)) {
        return res.status(403).json({ success: false, message: 'Doctor account is not approved or active.' });
    }
    const appointment = doctorService.getDoctorAppointment(req.user.id, req.params.appointmentId);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found.' });
    return res.json({ success: true, data: appointment });
}

function appointmentStatus(req, res) {
    if (!isDoctorAllowed(req)) {
        return res.status(403).json({ success: false, message: 'Doctor account is not approved or active.' });
    }
    const nextStatus = String(req.body?.status || '').trim().toUpperCase();
    const result = doctorService.setDoctorAppointmentStatus(req.user.id, req.params.appointmentId, nextStatus);
    if (result.error) return res.status(result.error[0]).json({ success: false, message: result.error[1] });
    return res.json({ success: true, message: 'Appointment status updated successfully.', data: result.data });
}

function patients(req, res) {
    if (!isDoctorAllowed(req)) {
        return res.status(403).json({ success: false, message: 'Doctor account is not approved or active.' });
    }
    return res.json({ success: true, data: doctorService.getDoctorPatients(req.user.id) });
}

function patientDetails(req, res) {
    if (!isDoctorAllowed(req)) {
        return res.status(403).json({ success: false, message: 'Doctor account is not approved or active.' });
    }
    const patient = doctorService.getDoctorPatient(req.user.id, req.params.patientId);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
    return res.json({ success: true, data: patient });
}

module.exports = { profile, updateProfile, status, appointments, appointmentDetails, appointmentStatus, patients, patientDetails };
