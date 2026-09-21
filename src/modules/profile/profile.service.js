const database = require('../../database/database');

const BLOOD_GROUPS = new Set(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
const GENDERS = new Set(['MALE', 'FEMALE', 'OTHER']);

function validateProfile(input) {
    const profile = {
        name: String(input.name || '').trim(),
        blood_group: String(input.blood_group || '').trim().toUpperCase(),
        gender: String(input.gender || '').trim().toUpperCase(),
        email: String(input.email || '').trim().toLowerCase(),
        city: String(input.city || '').trim(),
        avatar: String(input.avatar || '').trim() || null,
        latitude: input.latitude === undefined || input.latitude === '' ? null : Number(input.latitude),
        longitude: input.longitude === undefined || input.longitude === '' ? null : Number(input.longitude)
    };
    if (!profile.name) return 'Name is required.';
    if (!BLOOD_GROUPS.has(profile.blood_group)) return 'Valid blood group is required.';
    if (!GENDERS.has(profile.gender)) return 'Valid gender is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) return 'Valid email is required.';
    if (profile.latitude !== null && (!Number.isFinite(profile.latitude) || profile.latitude < -90 || profile.latitude > 90)) return 'Latitude must be between -90 and 90.';
    if (profile.longitude !== null && (!Number.isFinite(profile.longitude) || profile.longitude < -180 || profile.longitude > 180)) return 'Longitude must be between -180 and 180.';
    return profile;
}

function getProfile(userId) { return database.profiles[userId] || null; }

function saveProfile(user, input) {
    const result = validateProfile(input);
    if (typeof result === 'string') return { error: result };
    database.profiles[user.id] = result;
    user.name = result.name;
    user.isProfileCompleted = true;
    return result;
}

module.exports = { getProfile, saveProfile, validateProfile };
