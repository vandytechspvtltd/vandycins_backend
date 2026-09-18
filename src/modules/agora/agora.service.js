const crypto = require('crypto');
const { RtcTokenBuilder, RtcRole } = require('agora-token');
const database = require('../../database/database');
const config = require('../../config/env');

function getStableAgoraUid(consultationId, user) {
    const key = `${consultationId}:${user.id}`;
    if (database.agoraParticipants[key]) return database.agoraParticipants[key].uid;
    const digest = crypto.createHash('sha256').update(key).digest();
    let uid = digest.readUInt32BE(0) & 0x7fffffff;
    if (uid === 0) uid = 1;
    database.agoraParticipants[key] = { uid, consultationId, userId: user.id, role: user.role };
    return uid;
}

function generateAgoraToken(channelName, uid) {
    if (!config.agoraAppId) throw new Error('Agora App ID is not configured.');
    if (!config.agoraAppCertificate) throw new Error('Agora App Certificate is not configured.');
    const privilegeExpiredTs = Math.floor(Date.now() / 1000) + config.agoraTokenTtlSeconds;
    return RtcTokenBuilder.buildTokenWithUid(config.agoraAppId, config.agoraAppCertificate, channelName, uid, RtcRole.PUBLISHER, privilegeExpiredTs);
}

function getDoctorForConsultation(consultation) {
    return database.doctors.find(doctor => doctor.id === consultation.doctorId) || database.doctors[0];
}

module.exports = { getStableAgoraUid, generateAgoraToken, getDoctorForConsultation };
