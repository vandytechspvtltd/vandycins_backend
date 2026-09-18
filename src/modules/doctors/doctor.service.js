const database = require('../../database/database');

const SPECIALTY_TERMS = {
    'general physician': ['general physician'],
    cardiology: ['cardiology', 'cardiologist'],
    dermatology: ['dermatology', 'dermatologist'],
    pediatrics: ['pediatrics', 'pediatrician'],
    neurology: ['neurology', 'neurologist']
};

function parseNumber(value, name, options = {}) {
    if (value === undefined || value === '') return null;
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${name} must be a valid number.`);
    if (options.min !== undefined && number < options.min) throw new Error(`${name} must be at least ${options.min}.`);
    if (options.max !== undefined && number > options.max) throw new Error(`${name} must be at most ${options.max}.`);
    return number;
}

function distanceKm(latitude, longitude, doctor) {
    if (!Number.isFinite(doctor.latitude) || !Number.isFinite(doctor.longitude)) return null;
    const radians = value => value * Math.PI / 180;
    const earthRadiusKm = 6371;
    const latitudeDelta = radians(doctor.latitude - latitude);
    const longitudeDelta = radians(doctor.longitude - longitude);
    const a = Math.sin(latitudeDelta / 2) ** 2 +
        Math.cos(radians(latitude)) * Math.cos(radians(doctor.latitude)) *
        Math.sin(longitudeDelta / 2) ** 2;
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function specialtyMatches(doctorSpecialty, requestedSpecialty) {
    const terms = SPECIALTY_TERMS[requestedSpecialty] || [requestedSpecialty];
    return terms.some(term => doctorSpecialty.toLowerCase().includes(term));
}

function listDoctors(query = {}) {
    const search = String(query.search || '').trim().toLowerCase();
    const specialty = String(query.specialty || '').trim().toLowerCase();
    if (specialty && !SPECIALTY_TERMS[specialty]) throw new Error('Unknown specialty.');
    const latitude = parseNumber(query.latitude, 'latitude', { min: -90, max: 90 });
    const longitude = parseNumber(query.longitude, 'longitude', { min: -180, max: 180 });
    if ((latitude === null) !== (longitude === null)) {
        throw new Error('latitude and longitude must be provided together.');
    }
    const limit = parseNumber(query.limit, 'limit', { min: 1, max: 100 }) || 20;
    const offset = parseNumber(query.offset, 'offset', { min: 0 }) || 0;

    let doctors = database.doctors.filter(doctor => {
        const matchesSearch = !search || doctor.name.toLowerCase().includes(search) || doctor.specialty.toLowerCase().includes(search);
        const matchesSpecialty = !specialty || specialtyMatches(doctor.specialty, specialty);
        return matchesSearch && matchesSpecialty;
    });

    if (latitude !== null && longitude !== null) {
        doctors = doctors.map(doctor => ({ ...doctor, distance_km: distanceKm(latitude, longitude, doctor) }));
        doctors.sort((first, second) => {
            if (first.distance_km === null) return 1;
            if (second.distance_km === null) return -1;
            return first.distance_km - second.distance_km;
        });
    }

    const total = doctors.length;
    const items = doctors.slice(offset, offset + limit).map(doctor => ({
        id: doctor.id,
        name: doctor.name,
        profile_image: doctor.profile_image || null,
        specialty: doctor.specialty,
        experience_years: doctor.experience_years,
        rating: doctor.rating,
        review_count: doctor.review_count || 0,
        consultation_fee: doctor.consultation_fee,
        is_online: Boolean(doctor.is_online),
        location: doctor.location || null,
        ...(Object.prototype.hasOwnProperty.call(doctor, 'distance_km') ? { distance_km: doctor.distance_km } : {})
    }));

    return { items, pagination: { limit, offset, total } };
}

module.exports = { listDoctors, parseNumber };
