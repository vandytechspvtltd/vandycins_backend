const doctorService = require('./doctor.service');

function listDoctors(req, res) {
    try {
        return res.json({ success: true, ...doctorService.listDoctors(req.query) });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
}

function getDoctor(req, res) {
    const doctor = doctorService.getDoctor(req.params.doctorId);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found.' });
    return res.json({ success: true, data: doctor });
}

function getSlots(req, res) {
    if (req.query.date && !/^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date))) {
        return res.status(400).json({ success: false, message: 'date must use YYYY-MM-DD format.' });
    }
    const doctor = doctorService.getDoctor(req.params.doctorId);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found.' });
    return res.json({ success: true, data: { doctorId: req.params.doctorId, date: req.query.date, slots: doctorService.getAvailableSlots(req.params.doctorId, req.query.date) } });
}

module.exports = { listDoctors, getDoctor, getSlots };
