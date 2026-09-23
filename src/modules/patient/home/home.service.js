const database = require('../../../database/database');
const profileService = require('../profile/profile.service');
function value(...values) { return values.find(item => item !== undefined && item !== null && item !== '') ?? null; }
function number(valueToParse) {
    if (valueToParse === undefined || valueToParse === null || valueToParse === '') return null;
    const parsed = Number(valueToParse);
    return Number.isFinite(parsed) ? parsed : null;
}
function date(valueToParse) { const parsed = new Date(valueToParse); return valueToParse && !Number.isNaN(parsed.getTime()) ? parsed : null; }
function doctor(id) { return database.doctors.find(item => item.id === id) || null; }

function appointment(item) {
    const foundDoctor = doctor(item.doctorId);
    const scheduled = date(value(item.scheduledAt, item.dateTime, item.appointmentDate));
    return {
        id: item.id,
        doctorId: item.doctorId,
        doctorName: value(foundDoctor?.name, ''),
        doctorAvatar: value(foundDoctor?.avatar, foundDoctor?.profile_image),
        doctorSpecialty: value(foundDoctor?.specialty, ''),
        consultationType: value(item.consultationType, item.consultation_type, 'VIDEO'),
        status: value(item.status, 'UNKNOWN'),
        date: scheduled?.toISOString().slice(0, 10) || null,
        time: scheduled?.toISOString().slice(11, 16) || null,
        symptoms: value(item.symptoms, item.reason),
        prescriptionId: value(item.prescriptionId, item.prescription_id)
    };
}

function distanceKm(latitude, longitude, item) {
    const itemLatitude = number(item.latitude);
    const itemLongitude = number(item.longitude);
    if (latitude === null || longitude === null || itemLatitude === null || itemLongitude === null) return null;
    const radians = coordinate => coordinate * Math.PI / 180;
    const latitudeDelta = radians(itemLatitude - latitude);
    const longitudeDelta = radians(itemLongitude - longitude);
    const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(latitude)) * Math.cos(radians(itemLatitude)) * Math.sin(longitudeDelta / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getHomeData(user) {
    if (!user || user.role !== 'PATIENT') throw new Error('Patient access is required.');
    const profile = profileService.getProfile(user.id) || {};
    const location = user.location || profile.location || {};
    const latitude = number(value(profile.latitude, location.latitude, user.latitude));
    const longitude = number(value(profile.longitude, location.longitude, user.longitude));
    const consultations = Object.values(database.consultations).filter(item => item.patientId === user.id);
    const excluded = ['ENDED', 'COMPLETED', 'CANCELLED', 'CANCELED'];
    const upcoming = consultations.filter(item => !excluded.includes(String(item.status || '').toUpperCase()))
        .filter(item => date(value(item.scheduledAt, item.dateTime, item.appointmentDate))?.getTime() >= Date.now())
        .sort((a, b) => date(value(a.scheduledAt, a.dateTime, a.appointmentDate)) - date(value(b.scheduledAt, b.dateTime, b.appointmentDate)))[0];
    const previous = consultations.filter(item => excluded.includes(String(item.status || '').toUpperCase()))
        .sort((a, b) => new Date(b.scheduledAt || b.endedAt || b.createdAt) - new Date(a.scheduledAt || a.endedAt || a.createdAt)).slice(0, 2).map(appointment);
    const nearbyDoctors = database.doctors.filter(item => item.is_verified === true && item.is_active === true).map(item => ({
        id: item.id, name: item.name, avatar: value(item.avatar, item.profile_image), specialty: item.specialty,
        qualification: value(item.qualification, item.qualifications), experienceYears: number(value(item.experienceYears, item.experience_years)),
        rating: number(item.rating), reviewCount: number(value(item.reviewCount, item.review_count)) || 0,
        consultationFee: number(value(item.consultationFee, item.consultation_fee)), isOnline: Boolean(value(item.isOnline, item.is_online)), isVerified: true,
        clinicName: value(item.clinicName, item.clinic_name), clinicAddress: value(item.clinicAddress, item.clinic_address, item.location),
        distanceKm: distanceKm(latitude, longitude, item), registrationNumber: value(item.registrationNumber, item.registration_number), about: value(item.about, item.bio)
    })).sort((a, b) => (a.distanceKm === null ? 1 : b.distanceKm === null ? -1 : a.distanceKm - b.distanceKm)).slice(0, 3);
    const prescriptions = database.prescriptions.filter(item => item.patient_id === user.id || item.patientId === user.id)
        .sort((a, b) => new Date(b.date || b.created_at || b.createdAt) - new Date(a.date || a.created_at || a.createdAt)).map(item => {
            const foundDoctor = doctor(value(item.doctor_id, item.doctorId));
            return {
                id: item.id, date: value(item.date, item.created_at, item.createdAt), doctorId: value(item.doctor_id, item.doctorId),
                doctorName: value(item.doctor_name, item.doctorName, foundDoctor?.name), doctorSpecialty: value(item.doctor_specialty, item.doctorSpecialty, foundDoctor?.specialty),
                doctorRegistrationNumber: value(item.doctor_registration_number, item.doctorRegistrationNumber, foundDoctor?.registration_number), diagnosis: item.diagnosis,
                medicines: (item.medicines || []).map(medicine => ({ id: value(medicine.id, medicine.medicine_id), name: medicine.name, dosage: medicine.dosage, frequency: medicine.frequency, duration: medicine.duration, instructions: value(medicine.instructions, medicine.instruction) }))
            };
        });
    return {
        patient: { id: user.id, name: value(profile.name, user.name, ''), phone: value(user.phone, ''), email: value(profile.email, user.email, ''), avatar: value(profile.avatar, profile.profile_image, user.avatar, user.profile_image), city: value(profile.city, location.city, user.city) },
        location: { city: value(profile.city, location.city, user.city), latitude, longitude },
        notifications: { unreadCount: (database.notifications || []).filter(item => (item.patient_id === user.id || item.patientId === user.id) && item.read !== true && item.isRead !== true).length },
        specialities: database.specialties.map(item => ({ id: item.id, name: item.name, icon: value(item.icon, item.category) })),
        upcomingAppointment: upcoming ? appointment(upcoming) : null, nearbyDoctors, previousAppointments: previous, recentPrescriptions: prescriptions
    };
}

module.exports = { getHomeData };
