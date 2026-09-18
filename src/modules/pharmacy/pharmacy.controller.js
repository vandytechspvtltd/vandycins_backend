const crypto = require('crypto');
const database = require('../../database/database');

function listMedicines(req, res) {
    const query = String(req.query.search || '').trim().toLowerCase();
    const medicines = database.medicines.filter(item => !query || JSON.stringify(item).toLowerCase().includes(query));
    return res.json({ success: true, medicines });
}

function createOrder(req, res) {
    const id = `order_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const order = { id, user_id: req.user.id, items: req.body?.items || [], status: 'PLACED', created_at: new Date().toISOString() };
    database.orders[id] = order;
    return res.status(201).json({ success: true, order });
}

module.exports = { listMedicines, createOrder };
