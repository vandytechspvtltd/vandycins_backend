const express = require('express');
const authenticate = require('../../middleware/authMiddleware');
const controller = require('./pharmacy.controller');

const router = express.Router();
router.get('/medicines', authenticate, controller.listMedicines);
router.post('/orders', authenticate, controller.createOrder);
module.exports = router;
