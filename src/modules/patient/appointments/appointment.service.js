const crypto = require('crypto');
const database = require('../../../database/database');

const PLATFORM_FEE = 49;
const CONSULTATION_TYPES = new Set(['VIDEO', 'AUDIO', 'CHAT']);
const PAYMENT_METHODS = new Set(['UPI', 'CARD', 'NET_BANKING', 'WALLET']);

function doctorFor(doctorId) {
    return database.doctors.find(doctor => doctor.id === doctorId && doctor.is_active !== false) || null;
}

function consultationFee(doctor, type) {
    const fee = Number(doctor.fee ?? doctor.consultation_fee);
    if (!Number.isFinite(fee) || fee < 0) throw new Error('Doctor consultation fee is not configured.');
    if (type === 'AUDIO') return Math.max(300, fee - 100);
    if (type === 'CHAT') return Math.max(250, fee - 200);
    return fee;
}

function dateIsValid(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const parsed = new Date(`${date}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function normalizeSlot(slot, doctorId, date) {
    if (!slot || slot.doctorId !== doctorId || slot.date !== date) return null;
    const booked = Boolean(slot.bookedAppointmentId || slot.booked === true || slot.available === false);
    return {
        id: slot.id,
        doctorId,
        date,
        time: slot.time,
        period: slot.period || null,
        available: !booked,
        bookedAppointmentId: slot.bookedAppointmentId || null
    };
}

function timeTo24Hour(time) {
    const match = String(time || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const period = match[3].toUpperCase();
    if (hour < 1 || hour > 12 || minute > 59) return null;
    if (period === 'AM' && hour === 12) hour = 0;
    if (period === 'PM' && hour !== 12) hour += 12;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function scheduleTimeToMinutes(time) {
    const match = String(time || '').trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
}

function generatedSlotsForDoctorDate(doctor, date) {
    if (!Array.isArray(doctor?.schedule)) return [];
    const dayOfWeek = new Date(`${date}T00:00:00.000Z`).getUTCDay();
    const slots = [];

    doctor.schedule.filter(schedule => schedule.dayOfWeek === dayOfWeek || schedule.daysOfWeek?.includes(dayOfWeek)).forEach(schedule => {
        const startMinutes = scheduleTimeToMinutes(schedule.startTime);
        const endMinutes = scheduleTimeToMinutes(schedule.endTime);
        const duration = Number(schedule.slotDurationMinutes);
        if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes || !Number.isInteger(duration) || duration <= 0) return;

        for (let start = startMinutes; start + duration <= endMinutes; start += duration) {
            const hour = Math.floor(start / 60);
            const minute = start % 60;
            const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            slots.push({
                id: `${doctor.id}_${date}_${time.replace(':', '')}`,
                doctorId: doctor.id,
                date,
                time,
                period: hour < 12 ? 'AM' : 'PM'
            });
        }
    });

    return slots;
}

function slotsForDoctorDate(doctorId, date) {
    const stored = database.doctorSlots.filter(slot => slot.doctorId === doctorId && slot.date === date);
    const doctor = doctorFor(doctorId);
    const configured = Array.isArray(doctor?.availability) ? doctor.availability
        .filter(slot => slot.date === date)
        .map(slot => normalizeSlot({ ...slot, doctorId }, doctorId, date)) : [];
    const generated = generatedSlotsForDoctorDate(doctor, date);
    const slots = [...stored, ...configured, ...generated.filter(slot =>
        !stored.some(item => item.id === slot.id) && !configured.some(item => item.id === slot.id)
    )];
    return slots.map(slot => normalizeSlot(slot, doctorId, date)).filter(Boolean);
}

function findSlot(doctorId, date, slotId) {
    return slotsForDoctorDate(doctorId, date).find(slot => slot.id === slotId) || null;
}

function appointmentStatus(item) {
    if (['CONFIRMED', 'UPCOMING'].includes(item.status) && item.dateTime && new Date(item.dateTime).getTime() > Date.now()) return 'UPCOMING';
    return item.status;
}

function doctorSummary(doctor) {
    return doctor ? { id: doctor.id, name: doctor.name || null, avatar: doctor.profile_image || null, specialty: doctor.specialty || null } : null;
}

function toResponse(item) {
    const doctor = doctorFor(item.doctorId);
    const payment = database.payments.find(record => record.appointmentId === item.id) || null;
    return {
        id: item.id,
        appointmentId: item.id,
        doctorId: item.doctorId,
        slotId: item.slotId || null,
        doctorName: doctor?.name || null,
        doctorAvatar: doctor?.profile_image || null,
        doctorSpecialty: doctor?.specialty || null,
        type: item.consultationType,
        consultationType: item.consultationType,
        status: appointmentStatus(item),
        date: item.date,
        time: item.time,
        symptoms: item.symptoms || null,
        prescriptionId: item.prescriptionId || null,
        doctor: doctorSummary(doctor),
        patientId: item.patientId,
        fees: { consultationFee: item.consultationFee, platformFee: item.platformFee, totalAmount: item.totalAmount },
        consultationFee: item.consultationFee,
        platformFee: item.platformFee,
        totalAmount: item.totalAmount,
        paymentId: payment?.id || null,
        paymentStatus: payment?.status === 'SUCCESS' ? 'PAID' : (payment?.status || 'PENDING'),
        payment: payment ? { id: payment.id, method: payment.method, status: payment.status, transactionReference: payment.transactionReference || null, refundStatus: payment.refundStatus || null } : null
    };
}

function createBooking({ patientId, doctorId, date, slotId, consultationType, symptoms }) {
    if (!CONSULTATION_TYPES.has(consultationType)) throw Object.assign(new Error('consultationType must be VIDEO, AUDIO, or CHAT.'), { statusCode: 400 });
    const doctor = doctorFor(doctorId);
    if (!doctor) throw Object.assign(new Error('Doctor not found.'), { statusCode: 404 });
    if (!slotId) throw Object.assign(new Error('slotId must be the actual slot ID returned by the slots API.'), { statusCode: 400 });
    if (/^\d{4}-\d{2}-\d{2}$/.test(slotId)) throw Object.assign(new Error('slotId must be the actual slot ID, not a date. Send the date separately as date or slotDate.'), { statusCode: 400 });
    const storedSlot = database.doctorSlots.find(item => item.id === slotId && item.doctorId === doctorId);
    const slotDate = String(date || storedSlot?.date || String(slotId).match(/^[^_]+_(\d{4}-\d{2}-\d{2})_/)?.[1] || '').trim();
    if (!dateIsValid(slotDate)) throw Object.assign(new Error('A valid slot date is required.'), { statusCode: 400 });
    if (date && storedSlot?.date && storedSlot.date !== slotDate) throw Object.assign(new Error('The slot does not match the requested date.'), { statusCode: 400 });
    const currentSlot = findSlot(doctorId, slotDate, slotId);
    if (!currentSlot) throw Object.assign(new Error('Doctor slot not found for the requested doctor and date.'), { statusCode: 404 });
    if (!currentSlot.available) throw Object.assign(new Error('This doctor slot is no longer available.'), { statusCode: 409 });
    const time24 = timeTo24Hour(currentSlot.time) || (currentSlot.time && /^\d{2}:\d{2}$/.test(currentSlot.time) ? currentSlot.time : null);
    if (!dateIsValid(currentSlot.date) || !time24) throw Object.assign(new Error('Doctor slot has invalid date or time.'), { statusCode: 400 });
    const duplicate = database.appointments.find(item => item.doctorId === doctorId && item.slotId === slotId && !['CANCELLED', 'FAILED'].includes(item.status));
    if (duplicate) throw Object.assign(new Error('This doctor slot is already booked.'), { statusCode: 409 });
    const fee = consultationFee(doctor, consultationType);
    const appointment = {
        id: `apt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        patientId, doctorId, slotId, consultationType, symptoms: String(symptoms || '').trim() || null,
        date: currentSlot.date, time: currentSlot.time, time24, dateTime: new Date(`${currentSlot.date}T${time24}:00.000Z`).toISOString(),
        consultationFee: fee, platformFee: PLATFORM_FEE, totalAmount: fee + PLATFORM_FEE,
        status: 'PENDING_PAYMENT', createdAt: new Date().toISOString(), cancelledAt: null, cancellationReason: null, prescriptionId: null
    };
    database.appointments.push(appointment);
    database.payments.push({
        id: `pay_${appointment.id}`,
        appointmentId: appointment.id,
        patientId,
        amount: appointment.totalAmount,
        method: null,
        status: 'PENDING',
        provider: null,
        transactionReference: null,
        refundStatus: null,
        createdAt: appointment.createdAt,
        updatedAt: appointment.createdAt
    });
    if (storedSlot && storedSlot.date === currentSlot.date) storedSlot.bookedAppointmentId = appointment.id;
    else database.doctorSlots.push({ ...currentSlot, bookedAppointmentId: appointment.id });
    return appointment;
}

function initiatePayment(appointment, patientId, method) {
    if (appointment.patientId !== patientId) throw Object.assign(new Error('Appointment not found.'), { statusCode: 404 });
    if (!PAYMENT_METHODS.has(method)) throw Object.assign(new Error('paymentMethod must be UPI, CARD, NET_BANKING, or WALLET.'), { statusCode: 400 });
    if (appointment.status !== 'PENDING_PAYMENT') throw Object.assign(new Error('Payment cannot be initiated for this appointment.'), { statusCode: 409 });
    let payment = database.payments.find(item => item.appointmentId === appointment.id);
    if (payment && ['PENDING', 'SUCCESS'].includes(payment.status)) return payment;
    payment = { id: `pay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`, appointmentId: appointment.id, patientId, amount: appointment.totalAmount, method, status: 'PENDING', provider: process.env.PAYMENT_PROVIDER || null, transactionReference: null, refundStatus: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    database.payments.push(payment);
    return payment;
}

function cancelAppointment(appointment, patientId, reason) {
    if (!appointment || appointment.patientId !== patientId) throw Object.assign(new Error('Appointment not found.'), { statusCode: 404 });
    if (['COMPLETED', 'CANCELLED'].includes(appointment.status)) throw Object.assign(new Error('This appointment cannot be cancelled.'), { statusCode: 409 });
    if (appointment.dateTime && new Date(appointment.dateTime).getTime() <= Date.now()) throw Object.assign(new Error('This appointment has already started and cannot be cancelled.'), { statusCode: 409 });
    appointment.status = 'CANCELLED';
    appointment.cancelledAt = new Date().toISOString();
    appointment.cancellationReason = String(reason || '').trim() || null;
    const slot = database.doctorSlots.find(item => item.id === appointment.slotId);
    if (slot) delete slot.bookedAppointmentId;
    const payment = database.payments.find(item => item.appointmentId === appointment.id);
    if (payment?.status === 'SUCCESS') payment.refundStatus = 'NOT_SUPPORTED';
    return appointment;
}

module.exports = { PLATFORM_FEE, CONSULTATION_TYPES, PAYMENT_METHODS, doctorFor, slotsForDoctorDate, toResponse, createBooking, initiatePayment, cancelAppointment };
