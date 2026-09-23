const database = require('../../../database/database');

const BLOOD_GROUPS = new Set(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
const GENDERS = new Set(['MALE', 'FEMALE', 'OTHER']);

function validateProfile(input) {
    const profile = {
        name: String(input.name || '').trim(),
        gender: String(input.gender || '').trim().toUpperCase(),
        bloodGroup: String(input.bloodGroup || '').trim().toUpperCase(),
        age: input.age === undefined || input.age === '' ? null : Number(input.age),
        email: String(input.email || '').trim().toLowerCase(),
        image: String(input.image || '').trim() || null
    };
    if (!profile.name) return 'Name is required.';
    if (!GENDERS.has(profile.gender)) return 'Valid gender is required.';
    if (!BLOOD_GROUPS.has(profile.bloodGroup)) return 'Valid blood group is required.';
    if (!Number.isInteger(profile.age) || profile.age < 0) return 'Valid age is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) return 'Valid email is required.';
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
