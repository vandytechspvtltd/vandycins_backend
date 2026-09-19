const crypto = require('crypto');
const database = require('../../database/database');

function validWebhook(req) {
    const secret = String(process.env.PAYMENT_WEBHOOK_SECRET || '').trim();
    if (!secret) return false;
    const signature = String(req.headers['x-payment-signature'] || '').trim();
    const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body || {})).digest('hex');
    return Boolean(signature) && signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function webhook(req, res) {
    if (!process.env.PAYMENT_WEBHOOK_SECRET) return res.status(503).json({ success: false, message: 'Payment webhook is not configured.' });
    if (!validWebhook(req)) return res.status(401).json({ success: false, message: 'Invalid payment webhook signature.' });
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
