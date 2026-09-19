const express = require('express');
const authenticate = require('../../middleware/authMiddleware');
const controller = require('./appointment.controller');

const router = express.Router();
router.use(authenticate);
router.get('/', controller.list);
router.post('/', controller.book);
router.post('/:appointmentId/payment', controller.payment);
router.get('/:appointmentId', controller.details);
router.post('/:appointmentId/cancel', controller.cancel);
router.put('/:appointmentId/cancel', controller.cancel);

module.exports = router;
