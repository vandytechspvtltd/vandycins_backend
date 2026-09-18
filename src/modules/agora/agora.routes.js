const express = require('express');
const authenticate = require('../../middleware/authMiddleware');
const controller = require('./agora.controller');

const router = express.Router();
router.post('/:consultationId/join', authenticate, controller.join);
router.post('/:consultationId/renew-token', authenticate, controller.renewToken);
module.exports = router;
