const database = require('../../database/database');

const APPOINTMENT_TYPES = new Set(['VIDEO', 'AUDIO', 'CHAT']);

function doctorFor(id) {
    return database.doctors.find(doctor => doctor.id === id) || null;
}

function toAppointment(item) {
    const doctor = doctorFor(item.doctorId);
    const scheduled = item.scheduledAt ? new Date(item.scheduledAt) : null;
    return {
        id: item.id,
        doctorId: item.doctorId,
        doctorName: doctor?.name || null,
        doctorAvatar: doctor?.profile_image || null,
        doctorSpecialty: doctor?.specialty || null,
        type: item.consultationType || 'VIDEO',
        status: item.status === 'SCHEDULED' ? 'UPCOMING' : item.status,
        date: scheduled && !Number.isNaN(scheduled.getTime()) ? scheduled.toISOString().slice(0, 10) : null,
        time: scheduled && !Number.isNaN(scheduled.getTime()) ? scheduled.toISOString().slice(11, 16) : null,
        symptoms: item.symptoms || null,
        prescriptionId: item.prescriptionId || null
    };
}

function patientAppointment(item, patientId) {
    return item && item.patientId === patientId;
}

function list(req, res) {
    const appointments = Object.values(database.consultations)
        .filter(item => patientAppointment(item, req.user.id))
        .map(toAppointment);
    return res.json({ success: true, data: appointments });
}

function details(req, res) {
    const appointment = database.consultations[req.params.appointmentId];
    if (!patientAppointment(appointment, req.user.id)) return res.status(404).json({ success: false, message: 'Appointment not found.' });
    return res.json({ success: true, data: toAppointment(appointment) });
}

function book(req, res) {
    if (req.user.role !== 'PATIENT') return res.status(403).json({ success: false, message: 'Patient access is required.' });
    const doctorId = String(req.body?.doctorId || '').trim();
    const date = String(req.body?.date || '').trim();
    const time = String(req.body?.time || '').trim();
    const type = String(req.body?.type || 'VIDEO').trim().toUpperCase();
    if (!doctorId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !time || !APPOINTMENT_TYPES.has(type)) {
        return res.status(400).json({ success: false, message: 'doctorId, date, time, and a valid type are required.' });
    }
    const doctor = doctorFor(doctorId);
    if (!doctor || doctor.is_active === false) return res.status(404).json({ success: false, message: 'Doctor not found.' });
    return res.status(409).json({ success: false, message: 'No available slot exists for this doctor and time.' });
}

function cancel(req, res) {
    const appointment = database.consultations[req.params.appointmentId];
    if (!patientAppointment(appointment, req.user.id)) return res.status(404).json({ success: false, message: 'Appointment not found.' });
    if (['ENDED', 'COMPLETED', 'CANCELLED', 'CANCELED'].includes(String(appointment.status).toUpperCase())) {
        return res.status(409).json({ success: false, message: 'This appointment cannot be cancelled.' });
    }
    appointment.status = 'CANCELLED';
    return res.json({ success: true, data: toAppointment(appointment) });
}

module.exports = { list, details, book, cancel };
