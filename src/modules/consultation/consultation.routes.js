const express = require('express');
const authenticate = require('../../middleware/authMiddleware');
const controller = require('./consultation.controller');

const router = express.Router();
router.use(authenticate);
router.get('/', controller.listConsultations);
router.post('/', controller.scheduleConsultation);
router.post('/end', controller.endConsultation);
module.exports = router;
