const express = require('express');
const controller = require('./payment.controller');

const router = express.Router();
router.post('/webhook', controller.webhook);

module.exports = router;
