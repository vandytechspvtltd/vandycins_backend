const database = require('../../database/database');

function webhook(req, res) {
    const { paymentId, status, transactionReference } = req.body || {};
    const payment = database.payments.find(item => item.id === paymentId);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });
    if (!['SUCCESS', 'FAILED'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid payment status.' });
    if (payment.status === status) return res.json({ success: true, message: 'Webhook already processed.' });
    if (payment.status !== 'PENDING') return res.status(409).json({ success: false, message: 'Payment is already finalized.' });
    const appointment = database.appointments.find(item => item.id === payment.appointmentId);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found.' });
    payment.status = status;
    payment.transactionReference = transactionReference || null;
    payment.updatedAt = new Date().toISOString();
    appointment.status = status === 'SUCCESS' ? 'CONFIRMED' : 'CANCELLED';
    if (status === 'FAILED') {
        const slot = database.doctorSlots.find(item => item.id === appointment.slotId);
        if (slot) delete slot.bookedAppointmentId;
    }
    return res.json({ success: true, data: { payment, appointmentId: appointment.id, appointmentStatus: appointment.status } });
}

module.exports = { webhook };
