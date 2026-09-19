const express = require('express');
const authenticate = require('../../middleware/authMiddleware');
const controller = require('./doctor.controller');

const router = express.Router();
router.get('/', authenticate, controller.listDoctors);
router.get('/:doctorId', authenticate, controller.getDoctor);
router.get('/:doctorId/slots', authenticate, controller.getSlots);

module.exports = router;
