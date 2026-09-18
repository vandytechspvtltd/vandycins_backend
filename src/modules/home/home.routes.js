const express = require('express');
const authenticate = require('../../middleware/authMiddleware');
const database = require('../../database/database');
const controller = require('./home.controller');

const router = express.Router();

function authenticateHomeRequest(req, res, next) {
	const authorization = req.headers.authorization || '';
	const testUserId = String(process.env.TEST_USER_ID || '').trim();

	if (authorization || process.env.NODE_ENV !== 'development') {
		return authenticate(req, res, next);
	}

	const testUser = database.users[testUserId];
	if (!testUser || testUser.role !== 'PATIENT') {
		return res.status(500).json({
			success: false,
			message: 'TEST_USER_ID must reference an existing patient user.'
		});
	}

	req.user = testUser;
	return next();
}

router.get('/', authenticateHomeRequest, controller.getHome);

module.exports = router;
