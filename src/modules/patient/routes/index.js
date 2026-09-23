const express = require('express');
const authRoutes = require('../../auth/auth.routes');
const profileRoutes = require('../profile/profile.routes');
const orderRoutes = require('../orders/order.routes');
const homeRoutes = require('../home/home.routes');
const doctorDirectoryRoutes = require('../doctors/doctor.routes');
const specialtyRoutes = require('../specialties/specialty.routes');
const appointmentRoutes = require('../appointments/appointment.routes');
const notificationRoutes = require('../notifications/notification.routes');
const paymentRoutes = require('../payments/payment.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/home', homeRoutes);
router.use('/doctors', doctorDirectoryRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/payments', paymentRoutes);
router.use('/specialties', specialtyRoutes);
router.use('/specialities', specialtyRoutes);
router.use('/profile', profileRoutes);
router.use('/orders', orderRoutes);

module.exports = router;