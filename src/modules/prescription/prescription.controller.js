const database = require('../../database/database');

function create(req, res) {
    if (req.user.role !== 'DOCTOR') return res.status(403).json({ success: false, message: 'Doctor access is required.' });
    const patientId = String(req.body?.patientId || req.body?.patient_id || '').trim();
    const patient = database.users[patientId];
    if (!patient || patient.role !== 'PATIENT') return res.status(400).json({ success: false, message: 'Existing patientId is required.' });
    if (!String(req.body?.diagnosis || '').trim()) return res.status(400).json({ success: false, message: 'Diagnosis is required.' });
    if (!Array.isArray(req.body?.medicines)) return res.status(400).json({ success: false, message: 'Medicines must be an array.' });
    const medicines = req.body.medicines.map((medicine, index) => {
        const result = {
            id: String(medicine.id || `medicine_${Date.now()}_${index}`).trim(),
            name: String(medicine.name || '').trim(),
            dosage: String(medicine.dosage || '').trim(),
            frequency: String(medicine.frequency || '').trim(),
            duration: String(medicine.duration || '').trim(),
            instructions: String(medicine.instructions || medicine.instruction || '').trim()
        };
        return result;
    });
    if (medicines.some(medicine => !medicine.name || !medicine.dosage || !medicine.frequency || !medicine.duration)) {
        return res.status(400).json({ success: false, message: 'Each medicine requires name, dosage, frequency, and duration.' });
    }
    const doctor = database.doctors.find(item => item.id === req.user.id);
    const prescription = {
        id: String(req.body.id || `prescription_${Date.now()}_${patientId}`),
        patient_id: patientId,
        doctor_id: req.user.id,
        doctor_name: doctor?.name || req.user.name || '',
        doctor_specialty: doctor?.specialty || null,
        doctor_registration_number: doctor?.registration_number || null,
        date: new Date().toISOString(),
        diagnosis: String(req.body.diagnosis).trim(),
        medicines
    };
    database.prescriptions.push(prescription);
    database.notifications.push({
        id: `notification_${prescription.id}`,
        patientId,
        type: 'PRESCRIPTION_ISSUED',
        message: 'A new prescription is available.',
        read: false,
        createdAt: new Date().toISOString()
    });
    return res.status(201).json({ success: true, prescription });
}

function latest(req, res) {
    const prescription = database.prescriptions.filter(item => item.patient_id === req.user.id || item.patientId === req.user.id).slice(-1)[0] || null;
    return res.json({ success: true, prescription });
}

function list(req, res) {
    const prescriptions = database.prescriptions.filter(item => item.patient_id === req.user.id || item.patientId === req.user.id);
    return res.json({ success: true, data: prescriptions });
}

function byId(req, res) {
    const prescription = database.prescriptions.find(item => item.id === req.params.id);
    if (!prescription || (prescription.patient_id !== req.user.id && prescription.patientId !== req.user.id)) return res.status(404).json({ success: false, message: 'Prescription not found.' });
    return res.json({ success: true, prescription });
}

module.exports = { create, list, latest, byId };
