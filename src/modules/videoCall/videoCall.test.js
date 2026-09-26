const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const { test } = require('node:test');
const { Server } = require('socket.io');
const { io: createClient } = require('socket.io-client');

const config = require('../../config/env');
const database = require('../../database/database');
const attachVideoCallSignaling = require('./videoCall.signaling');
const videoCallRoutes = require('./videoCall.routes');
const videoCallService = require('./videoCall.service');

function tokenFor(userId, role) {
    return jwt.sign({ sub: userId, role, tokenType: 'access' }, config.jwtAccessSecret, { expiresIn: '1m' });
}

function connect(url, userId, role) {
    return new Promise((resolve, reject) => {
        const socket = createClient(url, {
            auth: { token: tokenFor(userId, role) },
            transports: ['websocket'],
            reconnection: false
        });
        socket.once('connect', () => resolve(socket));
        socket.once('connect_error', reject);
    });
}

function eventOnce(socket, event) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), 2500);
        socket.once(event, value => {
            clearTimeout(timer);
            resolve(value);
        });
    });
}

async function apiRequest(url, userId, role, method = 'GET') {
    return fetch(url, {
        method,
        headers: { Authorization: `Bearer ${tokenFor(userId, role)}` }
    });
}

test('Video Call REST and signaling enforce appointment membership and relay signaling only', async () => {
    const savedConfig = {
        jwtAccessSecret: config.jwtAccessSecret,
        webrtcStunUrls: config.webrtcStunUrls,
        webrtcTurnUrl: config.webrtcTurnUrl,
        webrtcTurnUsername: config.webrtcTurnUsername,
        webrtcTurnCredential: config.webrtcTurnCredential
    };
    const appointmentCount = database.appointments.length;
    const callSessionCount = database.callSessions.length;
    const testIds = {
        patient: 'video-call-test-patient',
        doctor: 'video-call-test-doctor',
        outsider: 'video-call-test-outsider',
        outsiderDoctor: 'video-call-test-outsider-doctor'
    };
    const oldUsers = Object.fromEntries(Object.values(testIds).map(id => [id, database.users[id]]));
    const clients = [];
    let io;

    try {
        config.jwtAccessSecret = 'video-call-test-secret';
        config.webrtcStunUrls = ['stun:stun.unit.test:3478'];
        config.webrtcTurnUrl = 'turn:turn.unit.test:3478';
        config.webrtcTurnUsername = 'unit-user';
        config.webrtcTurnCredential = 'unit-credential';
        for (const [id, role] of Object.entries({
            patient: 'PATIENT', doctor: 'DOCTOR', outsider: 'PATIENT', outsiderDoctor: 'DOCTOR'
        })) {
            database.users[testIds[id]] = {
                id: testIds[id], role, status: role === 'DOCTOR' ? 'APPROVED' : undefined,
                isActive: role === 'DOCTOR' ? true : undefined
            };
        }
        database.appointments.push({
            id: 'apt_video_call_test',
            patientId: testIds.patient,
            doctorId: testIds.doctor
        });

        const app = express();
        app.use('/v1', videoCallRoutes);
        const httpServer = http.createServer(app);
        io = new Server(httpServer);
        app.set('io', io);
        attachVideoCallSignaling(io);
        await new Promise(resolve => httpServer.listen(0, '127.0.0.1', resolve));
        const baseUrl = `http://127.0.0.1:${httpServer.address().port}`;

        const patient = await connect(baseUrl, testIds.patient, 'PATIENT');
        const doctor = await connect(baseUrl, testIds.doctor, 'DOCTOR');
        const outsider = await connect(baseUrl, testIds.outsider, 'PATIENT');
        const outsiderDoctor = await connect(baseUrl, testIds.outsiderDoctor, 'DOCTOR');
        clients.push(patient, doctor, outsider, outsiderDoctor);

        const protectedRoutes = [
            ['POST', '/v1/appointments/apt_video_call_test/call/start'],
            ['POST', '/v1/appointments/apt_video_call_test/call/accept'],
            ['POST', '/v1/appointments/apt_video_call_test/call/reject'],
            ['POST', '/v1/appointments/apt_video_call_test/call/end'],
            ['GET', '/v1/appointments/apt_video_call_test/call'],
            ['GET', '/v1/video-call/ice-servers']
        ];
        for (const [method, path] of protectedRoutes) {
            const response = await fetch(`${baseUrl}${path}`, { method });
            assert.equal(response.status, 401, `${method} ${path} should require authentication`);
        }

        const invalidJwtClient = createClient(baseUrl, {
            auth: { token: 'not-a-valid-jwt' },
            transports: ['websocket'],
            reconnection: false
        });
        clients.push(invalidJwtClient);
        assert.match((await eventOnce(invalidJwtClient, 'connect_error')).message, /Invalid or expired access token/);

        const incomingCall = eventOnce(doctor, 'call:incoming');
        const startResponse = await apiRequest(`${baseUrl}/v1/appointments/apt_video_call_test/call/start`, testIds.patient, 'PATIENT', 'POST');
        assert.equal(startResponse.status, 201);
        const started = (await startResponse.json()).data;
        assert.deepEqual(Object.keys(started), ['id', 'appointmentId', 'patientId', 'doctorId', 'status', 'startedAt', 'endedAt', 'createdAt']);
        assert.equal(started.status, 'RINGING');
        assert.equal((await incomingCall).id, started.id);
        const otherPatientStart = await apiRequest(`${baseUrl}/v1/appointments/apt_video_call_test/call/start`, testIds.outsider, 'PATIENT', 'POST');
        assert.equal(otherPatientStart.status, 403);

        const duplicateStart = await apiRequest(`${baseUrl}/v1/appointments/apt_video_call_test/call/start`, testIds.patient, 'PATIENT', 'POST');
        assert.equal(duplicateStart.status, 409);
        const unauthorizedAccept = await apiRequest(`${baseUrl}/v1/appointments/apt_video_call_test/call/accept`, testIds.patient, 'PATIENT', 'POST');
        assert.equal(unauthorizedAccept.status, 403);
        const otherDoctorAccept = await apiRequest(`${baseUrl}/v1/appointments/apt_video_call_test/call/accept`, testIds.outsiderDoctor, 'DOCTOR', 'POST');
        assert.equal(otherDoctorAccept.status, 403);
        const otherDoctorReject = await apiRequest(`${baseUrl}/v1/appointments/apt_video_call_test/call/reject`, testIds.outsiderDoctor, 'DOCTOR', 'POST');
        assert.equal(otherDoctorReject.status, 403);

        const acceptResponse = await apiRequest(`${baseUrl}/v1/appointments/apt_video_call_test/call/accept`, testIds.doctor, 'DOCTOR', 'POST');
        assert.equal(acceptResponse.status, 200);
        assert.equal((await acceptResponse.json()).data.status, 'ACCEPTED');

        const joinedByDoctor = eventOnce(doctor, 'call:joined');
        patient.emit('call:join', { callSessionId: started.id });
        doctor.emit('call:join', { callSessionId: started.id });
        assert.equal((await joinedByDoctor).status, 'ACTIVE');

        const offerReceived = eventOnce(doctor, 'call:offer');
        patient.emit('call:offer', { callSessionId: started.id, description: { type: 'offer', sdp: 'v=0 offer' } });
        assert.equal((await offerReceived).description.sdp, 'v=0 offer');

        const answerReceived = eventOnce(patient, 'call:answer');
        doctor.emit('call:answer', { callSessionId: started.id, description: { type: 'answer', sdp: 'v=0 answer' } });
        assert.equal((await answerReceived).description.sdp, 'v=0 answer');

        const candidateReceived = eventOnce(doctor, 'call:ice-candidate');
        patient.emit('call:ice-candidate', { callSessionId: started.id, candidate: { candidate: 'candidate:unit' } });
        assert.equal((await candidateReceived).candidate.candidate, 'candidate:unit');

        const invalidSessionError = eventOnce(outsider, 'call:error');
        outsider.emit('call:join', { callSessionId: 'not-a-call-id' });
        assert.match((await invalidSessionError).message, /Invalid callSessionId/);

        const unauthorizedSignal = eventOnce(outsider, 'call:error');
        outsider.emit('call:join', { callSessionId: started.id });
        assert.match((await unauthorizedSignal).message, /authorized/i);
        const unauthorizedDoctorSignal = eventOnce(outsiderDoctor, 'call:error');
        outsiderDoctor.emit('call:join', { callSessionId: started.id });
        assert.match((await unauthorizedDoctorSignal).message, /authorized/i);
        const unauthorizedOffer = eventOnce(outsider, 'call:error');
        outsider.emit('call:offer', { callSessionId: started.id, description: { type: 'offer', sdp: 'v=0 offer' } });
        assert.match((await unauthorizedOffer).message, /authorized/i);

        for (const user of [testIds.outsider, testIds.outsiderDoctor]) {
            const role = user === testIds.outsider ? 'PATIENT' : 'DOCTOR';
            assert.equal((await apiRequest(`${baseUrl}/v1/appointments/apt_video_call_test/call`, user, role)).status, 403);
            assert.equal((await apiRequest(`${baseUrl}/v1/appointments/apt_video_call_test/call/end`, user, role, 'POST')).status, 403);
        }
        assert.equal((await apiRequest(`${baseUrl}/v1/appointments/apt_video_call_test/call`, testIds.doctor, 'DOCTOR')).status, 200);

        const iceResponse = await apiRequest(`${baseUrl}/v1/video-call/ice-servers`, testIds.patient, 'PATIENT');
        assert.equal(iceResponse.status, 200);
        assert.deepEqual((await iceResponse.json()).data.iceServers, [
            { urls: ['stun:stun.unit.test:3478'] },
            { urls: 'turn:turn.unit.test:3478', username: 'unit-user', credential: 'unit-credential' }
        ]);

        const endResponse = await apiRequest(`${baseUrl}/v1/appointments/apt_video_call_test/call/end`, testIds.patient, 'PATIENT', 'POST');
        assert.equal(endResponse.status, 200);
        assert.equal((await endResponse.json()).data.status, 'ENDED');
        const invalidTransition = await apiRequest(`${baseUrl}/v1/appointments/apt_video_call_test/call/accept`, testIds.doctor, 'DOCTOR', 'POST');
        assert.equal(invalidTransition.status, 409);
        assert.throws(() => videoCallService.activateCall(started), error => error.statusCode === 409);

        const secondIncoming = eventOnce(doctor, 'call:incoming');
        const secondStart = await apiRequest(`${baseUrl}/v1/appointments/apt_video_call_test/call/start`, testIds.patient, 'PATIENT', 'POST');
        const rejectedSession = (await secondStart.json()).data;
        assert.equal((await secondIncoming).id, rejectedSession.id);
        const rejectedNotification = eventOnce(patient, 'call:rejected');
        const rejectResponse = await apiRequest(`${baseUrl}/v1/appointments/apt_video_call_test/call/reject`, testIds.doctor, 'DOCTOR', 'POST');
        assert.equal(rejectResponse.status, 200);
        assert.equal((await rejectedNotification).status, 'REJECTED');
        assert.throws(
            () => videoCallService.acceptCall({ id: testIds.doctor, role: 'DOCTOR' }, 'apt_video_call_test'),
            error => error.statusCode === 409
        );

        const thirdIncoming = eventOnce(doctor, 'call:incoming');
        const thirdStart = await apiRequest(`${baseUrl}/v1/appointments/apt_video_call_test/call/start`, testIds.patient, 'PATIENT', 'POST');
        const socketRejectedSession = (await thirdStart.json()).data;
        assert.equal((await thirdIncoming).id, socketRejectedSession.id);
        const socketRejectedNotification = eventOnce(patient, 'call:rejected');
        doctor.emit('call:reject', { callSessionId: socketRejectedSession.id });
        assert.equal((await socketRejectedNotification).status, 'REJECTED');

        const fourthStart = await apiRequest(`${baseUrl}/v1/appointments/apt_video_call_test/call/start`, testIds.patient, 'PATIENT', 'POST');
        const missedSession = videoCallService.markMissed((await fourthStart.json()).data.id);
        assert.equal(missedSession.status, 'MISSED');

        const callResponse = await apiRequest(`${baseUrl}/v1/appointments/apt_video_call_test/call`, testIds.patient, 'PATIENT');
        assert.equal(callResponse.status, 200);
        assert.equal((await callResponse.json()).data.status, 'MISSED');

        const fifthIncoming = eventOnce(doctor, 'call:incoming');
        const fifthStart = await apiRequest(`${baseUrl}/v1/appointments/apt_video_call_test/call/start`, testIds.patient, 'PATIENT', 'POST');
        const socketEndedSession = (await fifthStart.json()).data;
        assert.equal((await fifthIncoming).id, socketEndedSession.id);
        await apiRequest(`${baseUrl}/v1/appointments/apt_video_call_test/call/accept`, testIds.doctor, 'DOCTOR', 'POST');
        const socketEndJoin = eventOnce(doctor, 'call:joined');
        patient.emit('call:join', { callSessionId: socketEndedSession.id });
        doctor.emit('call:join', { callSessionId: socketEndedSession.id });
        assert.equal((await socketEndJoin).status, 'ACTIVE');
        const socketEnded = eventOnce(patient, 'call:ended');
        doctor.emit('call:end', { callSessionId: socketEndedSession.id });
        assert.equal((await socketEnded).status, 'ENDED');

        const doctorEndIncoming = eventOnce(doctor, 'call:incoming');
        const doctorEndStart = await apiRequest(`${baseUrl}/v1/appointments/apt_video_call_test/call/start`, testIds.patient, 'PATIENT', 'POST');
        const doctorEndSession = (await doctorEndStart.json()).data;
        assert.equal((await doctorEndIncoming).id, doctorEndSession.id);
        await apiRequest(`${baseUrl}/v1/appointments/apt_video_call_test/call/accept`, testIds.doctor, 'DOCTOR', 'POST');
        const doctorEndResponse = await apiRequest(`${baseUrl}/v1/appointments/apt_video_call_test/call/end`, testIds.doctor, 'DOCTOR', 'POST');
        assert.equal(doctorEndResponse.status, 200);
        assert.equal((await doctorEndResponse.json()).data.status, 'ENDED');

        const sixthIncoming = eventOnce(doctor, 'call:incoming');
        const sixthStart = await apiRequest(`${baseUrl}/v1/appointments/apt_video_call_test/call/start`, testIds.patient, 'PATIENT', 'POST');
        const disconnectedSession = (await sixthStart.json()).data;
        assert.equal((await sixthIncoming).id, disconnectedSession.id);
        await apiRequest(`${baseUrl}/v1/appointments/apt_video_call_test/call/accept`, testIds.doctor, 'DOCTOR', 'POST');
        const disconnectedJoin = eventOnce(doctor, 'call:joined');
        patient.emit('call:join', { callSessionId: disconnectedSession.id });
        doctor.emit('call:join', { callSessionId: disconnectedSession.id });
        assert.equal((await disconnectedJoin).status, 'ACTIVE');
        const doctorDisconnected = eventOnce(doctor, 'disconnect');
        doctor.disconnect();
        await doctorDisconnected;
        const disconnectedError = eventOnce(patient, 'call:error');
        patient.emit('call:offer', { callSessionId: disconnectedSession.id, description: { type: 'offer', sdp: 'v=0 offer' } });
        assert.match((await disconnectedError).message, /disconnected/i);
    } finally {
        for (const client of clients) client.disconnect();
        if (io) await new Promise(resolve => io.close(resolve));
        database.appointments.splice(appointmentCount);
        database.callSessions.splice(callSessionCount);
        for (const [id, user] of Object.entries(oldUsers)) {
            if (user) database.users[id] = user;
            else delete database.users[id];
        }
        Object.assign(config, savedConfig);
    }
});