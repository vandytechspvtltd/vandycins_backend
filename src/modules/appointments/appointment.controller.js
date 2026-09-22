const database = require('../../database/database');
const appointmentService = require('./appointment.service');

function patientAppointment(item, patientId) { return item && item.patientId === patientId; }

function list(req, res) {
    const status = String(req.query.status || '').trim().toUpperCase();
    const appointments = database.appointments.filter(item => patientAppointment(item, req.user.id))
        .filter(item => !status || appointmentService.toResponse(item).status === status)
        .map(appointmentService.toResponse);
    return res.json({ success: true, data: appointments });
}

function details(req, res) {
    const appointment = database.appointments.find(item => item.id === req.params.appointmentId);
    if (!patientAppointment(appointment, req.user.id)) return res.status(404).json({ success: false, message: 'Appointment not found.' });
    return res.json({ success: true, data: appointmentService.toResponse(appointment) });
}

function book(req, res) {
    if (req.user.role !== 'PATIENT') return res.status(403).json({ success: false, message: 'Patient access is required.' });
    const doctorId = String(req.body?.doctorId || '').trim();
    const slotId = String(req.body?.slotId || '').trim();
    const date = String(req.body?.date || req.body?.slotDate || '').trim();
    const consultationType = String(req.body?.consultationType || req.body?.type || 'VIDEO').trim().toUpperCase();
    try {
        const appointment = appointmentService.createBooking({ patientId: req.user.id, doctorId, date, slotId, consultationType, symptoms: req.body?.symptoms });
        return res.status(201).json({ success: true, message: 'Appointment created successfully', data: appointmentService.toResponse(appointment) });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Unable to create appointment.' });
    }
}

function cancel(req, res) {
    try {
        const appointment = appointmentService.cancelAppointment(database.appointments.find(item => item.id === req.params.appointmentId), req.user.id, req.body?.reason);
        return res.json({ success: true, message: 'Appointment cancelled successfully', data: appointmentService.toResponse(appointment) });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Unable to cancel appointment.' });
    }
}

function payment(req, res) {
    try {
        const appointment = database.appointments.find(item => item.id === req.params.appointmentId);
        const record = appointmentService.initiatePayment(appointment, req.user.id, String(req.body?.paymentMethod || '').trim().toUpperCase());
        return res.status(201).json({ success: true, message: 'Payment initiated and pending provider confirmation.', data: { paymentId: record.id, orderId: record.id, amount: record.amount, currency: 'INR', paymentMethod: record.method, status: record.status, provider: record.provider } });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Unable to initiate payment.' });
    }
}

function slots(req, res) {
    const date = String(req.query.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ success: false, message: 'date must use YYYY-MM-DD format.' });
    if (!appointmentService.doctorFor(req.params.doctorId)) return res.status(404).json({ success: false, message: 'Doctor not found.' });
    return res.json({ success: true, data: { doctorId: req.params.doctorId, date, slots: appointmentService.slotsForDoctorDate(req.params.doctorId, date) } });
}

module.exports = { list, details, book, cancel, payment, slots };
