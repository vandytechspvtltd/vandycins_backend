const database = require('../../database/database');
const config = require('../../config/env');
const consultationController = require('../consultation/consultation.controller');
const agoraService = require('./agora.service');

function join(req, res) {
    try {
        const consultationId = String(req.params.consultationId || '').trim();
        if (!consultationId) return res.status(400).json({ success: false, message: 'Consultation ID is required.' });
        let doctorId;
        let patientId;
        if (req.user.role === 'DOCTOR') { doctorId = req.user.id; patientId = database.liveQueue.patientId; }
        else { patientId = req.user.id; doctorId = database.liveDoctorId; }
        if (!doctorId) return res.status(404).json({ success: false, message: 'No doctor is currently active.' });
        if (!patientId) return res.status(404).json({ success: false, message: 'No patient is assigned to this consultation.' });
        const consultation = consultationController.createConsultationIfMissing(consultationId, doctorId, patientId);
        consultationController.assertConsultationParticipant(consultation, req.user);
        if (consultation.status !== 'ACTIVE') return res.status(409).json({ success: false, message: 'This consultation is no longer active.' });
        const doctor = agoraService.getDoctorForConsultation(consultation);
        if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
        const uid = agoraService.getStableAgoraUid(consultationId, req.user);
        const token = agoraService.generateAgoraToken(consultation.channelName, uid);
        if (req.user.role === 'DOCTOR') consultation.doctorJoined = true;
        if (req.user.role === 'PATIENT') consultation.patientJoined = true;
        return res.status(200).json({ success: true, appId: config.agoraAppId, channelName: consultation.channelName, token, uid, consultationId: consultation.id, doctorId: doctor.id, doctorName: doctor.name, specialty: doctor.specialty, doctorOnline: Boolean(doctor.is_online), doctorJoined: Boolean(consultation.doctorJoined), patientJoined: Boolean(consultation.patientJoined) });
    } catch (error) {
        console.error('[AGORA] JOIN FAILED:', error);
        return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Unable to join consultation.' });
    }
}

function renewToken(req, res) {
    try {
        const consultationId = String(req.params.consultationId || '').trim();
        const consultation = database.consultations[consultationId];
        if (!consultation) return res.status(404).json({ success: false, message: 'Consultation not found.' });
        consultationController.assertConsultationParticipant(consultation, req.user);
        if (consultation.status !== 'ACTIVE') return res.status(409).json({ success: false, message: 'This consultation is no longer active.' });
        const uid = agoraService.getStableAgoraUid(consultationId, req.user);
        return res.json({ token: agoraService.generateAgoraToken(consultation.channelName, uid), uid, channelName: consultation.channelName });
    } catch (error) {
        console.error('[AGORA] TOKEN RENEW FAILED:', error);
        return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Unable to renew Agora token.' });
    }
}

module.exports = { join, renewToken };
