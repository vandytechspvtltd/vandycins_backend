const database = require('../../../database/database');

function unreadCount(req, res) {
    const count = (database.notifications || []).filter(item =>
        (item.patientId === req.user.id || item.patient_id === req.user.id) &&
        item.read !== true && item.isRead !== true
    ).length;
    return res.json({ success: true, data: { unreadCount: count } });
}

module.exports = { unreadCount };
