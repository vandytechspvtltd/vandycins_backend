const express = require('express');
const authenticate = require('../../middleware/authMiddleware');
const controller = require('./profile.controller');

const router = express.Router();
router.use(authenticate);
router.get('/', controller.getProfile);
router.post('/', controller.createProfile);
router.put('/', controller.updateProfile);

module.exports = router;
