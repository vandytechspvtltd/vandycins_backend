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
    const minRating = parseNumber(query.minRating, 'minRating', { min: 0, max: 5 });
    const maxFee = parseNumber(query.maxFee, 'maxFee', { min: 0 });
    const minExperience = parseNumber(query.minExperience, 'minExperience', { min: 0 });
    const maxDistance = parseNumber(query.maxDistance, 'maxDistance', { min: 0 });
    const onlineOnly = query.onlineOnly === undefined ? false : String(query.onlineOnly).toLowerCase() === 'true';

    let doctors = database.doctors.filter(doctor => {
        const matchesSearch = !search || doctor.name.toLowerCase().includes(search) || doctor.specialty.toLowerCase().includes(search);
        const matchesSpecialty = !specialty || specialtyMatches(doctor.specialty, specialty);
        return matchesSearch && matchesSpecialty &&
            (minRating === null || Number(doctor.rating) >= minRating) &&
            (maxFee === null || Number(doctor.consultation_fee) <= maxFee) &&
            (minExperience === null || Number(doctor.experience_years) >= minExperience) &&
            (!onlineOnly || doctor.is_online === true);
    });

    if (latitude !== null && longitude !== null) {
        doctors = doctors.map(doctor => ({ ...doctor, distance_km: distanceKm(latitude, longitude, doctor) }));
        doctors.sort((first, second) => {
            if (first.distance_km === null) return 1;
            if (second.distance_km === null) return -1;
            return first.distance_km - second.distance_km;
        });
    }

    if (maxDistance !== null && latitude !== null && longitude !== null) {
        doctors = doctors.filter(doctor => doctor.distance_km !== null && doctor.distance_km <= maxDistance);
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
        ...(Object.prototype.hasOwnProperty.call(doctor, 'distance_km') ? { distance_km: doctor.distance_km } : {}),
        avatar: doctor.profile_image || null,
        qualification: doctor.qualification || doctor.qualifications || null,
        experienceYears: doctor.experience_years ?? null,
        reviewCount: doctor.review_count || 0,
        consultationFee: doctor.consultation_fee ?? null,
        isOnline: Boolean(doctor.is_online),
        isVerified: Boolean(doctor.is_verified),
        clinicName: doctor.clinic_name || null,
        clinicAddress: doctor.clinic_address || doctor.location || null,
        distanceKm: Object.prototype.hasOwnProperty.call(doctor, 'distance_km') ? doctor.distance_km : null,
        registrationNumber: doctor.registration_number || null,
        about: doctor.about || doctor.bio || null
    }));

    return { items, pagination: { limit, offset, total } };
}

function doctorProfile(doctor) {
    return {
        id: doctor.id,
        name: doctor.name || null,
        avatar: doctor.avatar || doctor.profile_image || null,
        specialty: doctor.specialty || null,
        qualification: doctor.qualification || doctor.qualifications || null,
        experienceYears: doctor.experienceYears ?? doctor.experience_years ?? null,
        rating: doctor.rating ?? 0,
        reviewCount: doctor.reviewCount ?? doctor.review_count ?? 0,
        consultationFee: doctor.consultationFee ?? doctor.consultation_fee ?? null,
        isOnline: Boolean(doctor.isOnline ?? doctor.is_online),
        isVerified: Boolean(doctor.isVerified ?? doctor.is_verified),
        clinicName: doctor.clinicName ?? doctor.clinic_name ?? null,
        clinicAddress: doctor.clinicAddress ?? doctor.clinic_address ?? doctor.location ?? null,
        distanceKm: null,
        registrationNumber: doctor.registrationNumber ?? doctor.registration_number ?? null,
        about: doctor.about ?? doctor.bio ?? null,
        availableSlots: Array.isArray(doctor.availableSlots) ? doctor.availableSlots : [],
        reviews: Array.isArray(doctor.reviews) ? doctor.reviews : []
    };
}

function getDoctor(id) {
    const doctor = database.doctors.find(item => item.id === id && item.is_active !== false);
    return doctor ? doctorProfile(doctor) : null;
}

function getAvailableSlots(id, date) {
    const doctor = database.doctors.find(item => item.id === id);
    if (!doctor || !date || !Array.isArray(doctor.availability)) return [];
    return doctor.availability.filter(slot => slot.date === date && slot.isAvailable === true);
}

module.exports = { listDoctors, getDoctor, getAvailableSlots, parseNumber };
