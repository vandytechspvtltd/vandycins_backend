const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const { test } = require('node:test');
const { Server } = require('socket.io');
const { io: createClient } = require('socket.io-client');

const config = require('../../config/env');
const database = require('../../database/database');
const attachWebRtcSignaling = require('./signaling');
const webrtcService = require('./webrtc.service');

function accessToken(userId, role) {
    return jwt.sign({ sub: userId, role, tokenType: 'access' }, config.jwtAccessSecret, { expiresIn: '1m' });
}

function connectClient(url, userId, role) {
    return new Promise((resolve, reject) => {
        const client = createClient(url, {
            auth: { token: accessToken(userId, role) },
            transports: ['websocket'],
            reconnection: false
        });
        client.once('connect', () => resolve(client));
        client.once('connect_error', reject);
    });
}

function waitForEvent(client, event) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), 2000);
        client.once(event, value => {
            clearTimeout(timeout);
            resolve(value);
        });
    });
}

test('WebRTC credentials and appointment signaling are authenticated', async () => {
    const savedConfig = {
        jwtAccessSecret: config.jwtAccessSecret,
        webrtcStunUrls: config.webrtcStunUrls,
        webrtcTurnUrls: config.webrtcTurnUrls,
        webrtcTurnUrl: config.webrtcTurnUrl,
        webrtcTurnUsername: config.webrtcTurnUsername,
        webrtcTurnCredential: config.webrtcTurnCredential,
        turnSharedSecret: config.turnSharedSecret,
        turnCredentialTtlSeconds: config.turnCredentialTtlSeconds
    };
    const appointmentCount = database.appointments.length;
    const paymentCount = database.payments.length;
    const ids = {
        patient: 'test-webrtc-patient',
        doctor: 'test-webrtc-doctor',
        outsider: 'test-webrtc-outsider'
    };
    const oldUsers = Object.fromEntries(Object.values(ids).map(id => [id, database.users[id]]));
    const sockets = [];
    let realtimeServer;

    try {
        config.jwtAccessSecret = 'webrtc-test-access-secret';
        config.webrtcStunUrls = ['stun:stun.test.invalid:3478'];
        config.webrtcTurnUrls = ['turn:turn.test.invalid:3478?transport=udp'];
        config.turnSharedSecret = 'test-turn-shared-secret';
        config.turnCredentialTtlSeconds = 600;

        const now = 1700000000;
        const ice = webrtcService.iceServerConfiguration(ids.patient, now);
        const turn = ice.iceServers[1];
        assert.equal(ice.expiresAt, now + 600);
        assert.equal(turn.username, `${now + 600}:${ids.patient}`);
        assert.equal(turn.credential, crypto.createHmac('sha1', config.turnSharedSecret).update(turn.username).digest('base64'));

        config.turnSharedSecret = '';
        config.webrtcTurnUsername = 'static-turn-user';
        config.webrtcTurnCredential = 'static-turn-credential';
        const staticIce = webrtcService.iceServerConfiguration(ids.patient, now);
        assert.equal(staticIce.expiresAt, null);
        assert.equal(staticIce.turnConfigured, true);
        assert.deepEqual(staticIce.iceServers[1], {
            urls: config.webrtcTurnUrls,
            username: 'static-turn-user',
            credential: 'static-turn-credential'
        });

        config.turnSharedSecret = 'test-turn-shared-secret';
        database.users[ids.patient] = { id: ids.patient, role: 'PATIENT' };
        database.users[ids.doctor] = { id: ids.doctor, role: 'DOCTOR', status: 'APPROVED', isActive: true };
        database.users[ids.outsider] = { id: ids.outsider, role: 'PATIENT' };
        database.appointments.push({
            id: 'test-webrtc-appointment',
            patientId: ids.patient,
            doctorId: ids.doctor,
            consultationType: 'VIDEO',
            status: 'CONFIRMED'
        });
        database.payments.push({ appointmentId: 'test-webrtc-appointment', status: 'SUCCESS' });

        const httpServer = http.createServer();
        realtimeServer = new Server(httpServer);
        attachWebRtcSignaling(realtimeServer);
        await new Promise(resolve => httpServer.listen(0, '127.0.0.1', resolve));
        const url = `http://127.0.0.1:${httpServer.address().port}`;

        const patient = await connectClient(url, ids.patient, 'PATIENT');
        const doctor = await connectClient(url, ids.doctor, 'DOCTOR');
        const outsider = await connectClient(url, ids.outsider, 'PATIENT');
        sockets.push(patient, doctor, outsider);

        const appointmentId = 'test-webrtc-appointment';
        assert.equal((await patient.timeout(1000).emitWithAck('webrtc:join', { appointmentId })).ok, true);
        assert.equal((await doctor.timeout(1000).emitWithAck('webrtc:join', { appointmentId })).ok, true);
        assert.equal((await outsider.timeout(1000).emitWithAck('webrtc:join', { appointmentId })).ok, false);

        const receivedOffer = waitForEvent(doctor, 'webrtc:offer');
        assert.equal((await patient.timeout(1000).emitWithAck('webrtc:offer', {
            appointmentId,
            description: { type: 'offer', sdp: 'v=0 test-offer' }
        })).ok, true);
        assert.equal((await receivedOffer).description.sdp, 'v=0 test-offer');

        const receivedCandidate = waitForEvent(doctor, 'webrtc:ice-candidate');
        assert.equal((await patient.timeout(1000).emitWithAck('webrtc:ice-candidate', {
            appointmentId,
            candidate: { candidate: 'candidate:test' }
        })).ok, true);
        assert.equal((await receivedCandidate).candidate.candidate, 'candidate:test');
    } finally {
        for (const socket of sockets) socket.disconnect();
        if (realtimeServer) await new Promise(resolve => realtimeServer.close(resolve));
        database.appointments.splice(appointmentCount);
        database.payments.splice(paymentCount);
        for (const [id, user] of Object.entries(oldUsers)) {
            if (user) database.users[id] = user;
            else delete database.users[id];
        }
        Object.assign(config, savedConfig);
    }
});