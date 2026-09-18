const doctorService = require('./doctor.service');

function listDoctors(req, res) {
    try {
        return res.json({ success: true, ...doctorService.listDoctors(req.query) });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
}

module.exports = { listDoctors };
