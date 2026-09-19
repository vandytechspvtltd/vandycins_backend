const express = require('express');
const authenticate = require('../../middleware/authMiddleware');
const controller = require('./appointment.controller');

const router = express.Router();
router.use(authenticate);
router.get('/', controller.list);
router.post('/', controller.book);
router.get('/:appointmentId', controller.details);
router.put('/:appointmentId/cancel', controller.cancel);

module.exports = router;
