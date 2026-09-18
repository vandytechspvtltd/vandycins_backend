const database = require('../../database/database');

function listHealthServices(req, res) {
    return res.json({ success: true, items: database.healthServices });
}

module.exports = { listHealthServices };
