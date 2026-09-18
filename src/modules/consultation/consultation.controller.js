const crypto = require('crypto');
const database = require('../../database/database');

function createConsultationIfMissing(consultationId, doctorId, patientId) {
    if (!consultationId || consultationId.length > 128) throw new Error('Invalid consultation ID.');
    if (!doctorId) throw new Error('Doctor ID is required.');
    if (!patientId) throw new Error('Patient ID is required.');
    if (!database.doctors.find(item => item.id === doctorId)) { const error = new Error('Doctor profile not found.'); error.statusCode = 404; throw error; }
    const patient = database.users[patientId];
    if (!patient || patient.role !== 'PATIENT') { const error = new Error('Patient account not found.'); error.statusCode = 404; throw error; }
    let consultation = database.consultations[consultationId];
    if (!consultation) {
        const safeId = consultationId.replace(/[^a-zA-Z0-9_-]/g, '_');
        consultation = database.consultations[consultationId] = {
            id: consultationId, doctorId, patientId,
            channelName: `vandycins_${safeId}_${crypto.randomBytes(4).toString('hex')}`,
            status: 'ACTIVE', createdAt: new Date().toISOString(), doctorJoined: false, patientJoined: false
        };
    }
    if (consultation.doctorId !== doctorId || consultation.patientId !== patientId) { const error = new Error('Consultation participants do not match.'); error.statusCode = 403; throw error; }
    return consultation;
}

function assertConsultationParticipant(consultation, user) {
    const isDoctor = user.role === 'DOCTOR' && user.id === consultation.doctorId;
    const isPatient = user.role === 'PATIENT' && user.id === consultation.patientId;
    if (!isDoctor && !isPatient) { const error = new Error('You are not a participant of this consultation.'); error.statusCode = 403; throw error; }
}

function listConsultations(req, res) {
    try {
        const consultations = [];
        const doctor = database.doctors.find(item => item.id === database.liveDoctorId);
        const patientId = database.liveQueue.patientId;
        if (doctor && patientId) {
            const consultation = createConsultationIfMissing(`live_${doctor.id}_${patientId}`, doctor.id, patientId);
            const patient = database.users[patientId];
            consultations.push({ consultation_id: consultation.id, doctor_id: consultation.doctorId, patient_id: consultation.patientId, doctor_name: doctor.name, doctor_specialty: doctor.specialty, patient_name: patient?.name || 'Patient', channel_name: consultation.channelName, scheduled_at: null, status: consultation.status, created_at: consultation.createdAt });
        }
        Object.values(database.consultations).forEach(consultation => {
            if (consultations.some(item => item.consultation_id === consultation.id)) return;
            const doctorForConsultation = database.doctors.find(item => item.id === consultation.doctorId);
            const patient = database.users[consultation.patientId];
            consultations.push({ consultation_id: consultation.id, doctor_id: consultation.doctorId, patient_id: consultation.patientId, doctor_name: doctorForConsultation?.name || 'Doctor', doctor_specialty: doctorForConsultation?.specialty || 'General Physician', patient_name: patient?.name || 'Patient', channel_name: consultation.channelName, scheduled_at: consultation.scheduledAt || null, status: consultation.status, created_at: consultation.createdAt });
        });
        return res.status(200).json({ success: true, consultations });
    } catch (error) {
        console.error('[CONSULTATIONS] LIST FAILED:', error);
        return res.status(500).json({ success: false, message: error.message || 'Unable to load consultations.' });
    }
}

function scheduleConsultation(req, res) {
    if (req.user.role !== 'PATIENT') return res.status(403).json({ success: false, message: 'Patient access is required.' });
    const doctorId = String(req.body?.doctorId || '').trim();
    const scheduledAt = new Date(req.body?.scheduledAt);
    const doctor = database.doctors.find(item => item.id === doctorId && item.is_active !== false);
    if (!doctor) return res.status(400).json({ success: false, message: 'Active doctor not found.' });
    if (!req.body?.scheduledAt || Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
        return res.status(400).json({ success: false, message: 'A valid future scheduledAt is required.' });
    }
    const consultationId = String(req.body?.id || `appointment_${Date.now()}_${req.user.id}`);
    if (database.consultations[consultationId]) return res.status(409).json({ success: false, message: 'Appointment ID already exists.' });
    const consultation = database.consultations[consultationId] = {
        id: consultationId,
        doctorId,
        patientId: req.user.id,
        scheduledAt: scheduledAt.toISOString(),
        consultationType: String(req.body?.consultationType || 'VIDEO').trim().toUpperCase(),
        symptoms: String(req.body?.symptoms || req.body?.reason || '').trim() || null,
        status: 'SCHEDULED',
        createdAt: new Date().toISOString()
    };
    database.notifications.push({
        id: `notification_${consultationId}`,
        patientId: req.user.id,
        type: 'APPOINTMENT_SCHEDULED',
        message: `Appointment scheduled with ${doctor.name}.`,
        read: false,
        createdAt: new Date().toISOString()
    });
    return res.status(201).json({ success: true, appointment: consultation });
}

function endConsultation(req, res) {
    const consultationId = String(req.body.consultation_id || '').trim();
    const consultation = database.consultations[consultationId];
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation not found.' });
    try { assertConsultationParticipant(consultation, req.user); } catch (error) { return res.status(error.statusCode || 403).json({ success: false, message: error.message }); }
    consultation.status = 'ENDED';
    consultation.endedAt = new Date().toISOString();
    consultation.durationSeconds = Math.max(0, Number(req.body.duration_seconds || 0));
    return res.status(200).send();
}

module.exports = { createConsultationIfMissing, assertConsultationParticipant, listConsultations, scheduleConsultation, endConsultation };
