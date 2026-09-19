const jwt = require('jsonwebtoken');

const config = require('../config/env');
const database = require('../database/database');

function authenticate(req, res, next) {

    try {

        const authorization = req.headers.authorization || '';

        console.log('\n========== AUTH REQUEST ==========');
        console.log('Method:', req.method);
        console.log('URL:', req.originalUrl);
        console.log('Authorization present:', Boolean(authorization));

        if (!authorization.startsWith('Bearer ')) {

            console.log('❌ Bearer token missing');

            return res.status(401).json({
                success: false,
                message: 'Authorization Bearer token is required.'
            });
        }

        if (!config.jwtAccessSecret) {

            console.log('❌ JWT secret missing');

            return res.status(503).json({
                success: false,
                message: 'Authentication service is not configured.'
            });
        }

        const accessToken = authorization.substring(7).trim();

        const payload = jwt.verify(
            accessToken,
            config.jwtAccessSecret
        );

        console.log('✅ JWT verified');
        console.log('JWT user ID:', payload.sub);
        console.log('JWT role:', payload.role);

        let user = database.users[payload.sub];

        if (!user) {

            console.log('⚠️ User not found in database, auto-provisioning from JWT payload:', payload.sub);
            user = {
                id: payload.sub,
                phone: payload.phone || '',
                role: payload.role || 'PATIENT',
                name: '',
                isProfileCompleted: false
            };
            database.users[payload.sub] = user;
        }

        console.log('✅ User found');
        console.log('Database user ID:', user.id);
        console.log('Database user role:', user.role);

        if (user.role !== payload.role) {

            console.log('❌ Role mismatch');
            console.log('JWT role:', payload.role);
            console.log('User role:', user.role);

            return res.status(401).json({
                success: false,
                message: 'Invalid authentication role.'
            });
        }

        req.user = user;

        console.log('✅ AUTHENTICATION SUCCESS');
        console.log('User ID:', user.id);
        console.log('Role:', user.role);
        console.log('=================================\n');

        next();

    } catch (error) {

        console.log('\n========== AUTH FAILED ==========');
        console.log('Error:', error.message);
        console.log('=================================\n');

        return res.status(401).json({
            success: false,
            message: 'Invalid or expired access token.'
        });
    }
}

module.exports = authenticate;