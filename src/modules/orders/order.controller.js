const database = require('../../database/database');

function tracking(req, res) {
    const order = database.orders[req.params.id];
    if (!order || order.user_id !== req.user.id) return res.status(404).json({ success: false, message: 'Order not found.' });
    return res.json({ success: true, order, tracking: { status: order.status } });
}

module.exports = { tracking };
