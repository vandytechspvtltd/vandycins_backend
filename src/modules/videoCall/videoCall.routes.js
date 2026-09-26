const express = require('express');
const authenticate = require('../../middleware/authMiddleware');
const controller = require('./videoCall.controller');

const router = express.Router();
router.use(authenticate);
router.get('/video-call/ice-servers', controller.iceServers);
router.post('/appointments/:appointmentId/call/start', controller.start);
router.post('/appointments/:appointmentId/call/accept', controller.accept);
router.post('/appointments/:appointmentId/call/reject', controller.reject);
router.post('/appointments/:appointmentId/call/end', controller.end);
router.get('/appointments/:appointmentId/call', controller.get);

module.exports = router;