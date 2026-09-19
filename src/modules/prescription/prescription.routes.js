const express = require('express');
const authenticate = require('../../middleware/authMiddleware');
const controller = require('./prescription.controller');

const router = express.Router();
router.post('/', authenticate, controller.create);
router.get('/', authenticate, controller.list);
router.get('/latest', authenticate, controller.latest);
router.get('/:id', authenticate, controller.byId);
module.exports = router;
