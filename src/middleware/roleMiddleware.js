const database = require('../database/database');

function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'You are not authorized to access this resource.' });
        }

        if (allowedRoles.includes('DOCTOR')) {
            const doctorRegistration = database.doctorRegistrations.find(item => item.userId === req.user.id);
            const userStatus = req.user.status || doctorRegistration?.status || 'PENDING';
            const userActive = typeof req.user.isActive === 'boolean' ? req.user.isActive : doctorRegistration ? doctorRegistration.isActive !== false : false;
            if (!doctorRegistration || userStatus !== 'APPROVED' || userActive !== true) {
                return res.status(403).json({ success: false, message: 'Doctor account is not approved or active.' });
            }
        }

        next();
    };
}

module.exports = requireRole;