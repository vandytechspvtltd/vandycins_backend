const database = require('../../../database/database');

function listSpecialties(req, res) {
    const specialties = database.specialties.map(specialty => ({
        ...specialty,
        doctor_count: database.doctors.filter(doctor => {
            const name = specialty.name.toLowerCase();
            const doctorSpecialty = doctor.specialty.toLowerCase();
            return doctorSpecialty.includes(name) ||
                (name === 'cardiology' && doctorSpecialty.includes('cardiologist')) ||
                (name === 'dermatology' && doctorSpecialty.includes('dermatologist'));
        }).length
    }));
    return res.json({ success: true, items: specialties });
}

module.exports = { listSpecialties };
