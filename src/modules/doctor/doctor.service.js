const crypto = require('crypto');
const database = require('../../database/database');
const authService = require('../auth/auth.service');
const { hashPassword, verifyPassword } = require('../../utils/password');
const { clean, validateRegistration, validateProfileUpdate } = require('./doctor.validation');

const STATUSES = new Set(['PENDING', 'APPROVED', 'REJECTED']);

function publicRegistration(registration) {
	const { passwordHash, ...safeRegistration } = registration;
	return safeRegistration;
}

function findRegistration(id) {
	return database.doctorRegistrations.find(item => item.id === id || item.userId === id) || null;
}

function findByEmailOrMobile(email, mobile) {
	return database.doctorRegistrations.find(item => item.email === email || item.mobile === mobile) || null;
}

function toDoctorProfile(registration, doctor) {
	const source = doctor || registration;
	return {
		id: registration.userId || registration.id,
		name: source.name || null,
		email: registration.email || null,
		mobile: registration.mobile || null,
		specialization: source.specialization || source.specialty || null,
		qualification: source.qualification || null,
		experience: source.experience ?? source.experience_years ?? null,
		registrationNumber: source.registrationNumber || source.registration_number || null,
		clinicName: source.clinicName || source.clinic_name || null,
		clinicAddress: source.clinicAddress || source.clinic_address || null,
		bio: source.bio || source.about || null,
		status: registration.status,
		isActive: doctor ? doctor.is_active !== false : registration.status === 'APPROVED',
		registrationDate: registration.registrationDate
	};
}

function register(input) {
	const email = clean(input.email).toLowerCase();
	const mobile = clean(input.mobile || input.phone).replace(/[\s-]/g, '');
	const existing = findByEmailOrMobile(email, mobile) || Object.values(database.users).find(user => user.email === email || user.phone === mobile);
	const validationError = validateRegistration(input, existing);
	if (validationError) return { error: [400, validationError] };

	const id = `doc_${crypto.randomUUID()}`;
	const registration = {
		id,
		userId: id,
		name: clean(input.name),
		email,
		mobile,
		specialization: clean(input.specialization || input.specialty),
		qualification: clean(input.qualification),
		experience: input.experience === undefined || input.experience === '' ? null : Number(input.experience),
		registrationNumber: clean(input.registrationNumber || input.registration_number),
		clinicName: clean(input.clinicName || input.clinic_name),
		clinicAddress: clean(input.clinicAddress || input.clinic_address),
		bio: clean(input.bio),
		status: 'PENDING',
		registrationDate: new Date().toISOString(),
		passwordHash: hashPassword(input.password),
		rejectionReason: null,
		isActive: false
	};
	database.doctorRegistrations.push(registration);
	database.users[id] = { id, phone: mobile, email, role: 'DOCTOR', name: registration.name, status: 'PENDING', isActive: false, isProfileCompleted: true };
	return { data: publicRegistration(registration) };
}
function login(emailInput, password) {
    const email = clean(emailInput).toLowerCase();

    const registration = database.doctorRegistrations.find(
        item => item.email === email
    );

    console.log('[DOCTOR LOGIN]', {
        email,
        found: !!registration,
        hasPasswordHash: !!registration?.passwordHash,
        passwordHashLength: registration?.passwordHash?.length,
        status: registration?.status,
        isActive: registration?.isActive
    });

    if (!registration) {
        console.log('[DOCTOR LOGIN] Doctor not found');
        return {
            error: [401, 'Invalid email or password.']
        };
    }

    const passwordValid = verifyPassword(
        String(password || ''),
        registration.passwordHash
    );

    console.log('[DOCTOR LOGIN] Password valid:', passwordValid);

    if (!passwordValid) {
        console.log('[DOCTOR LOGIN] Password verification failed');
        return {
            error: [401, 'Invalid email or password.']
        };
    }

    if (
        registration.status !== 'APPROVED' ||
        registration.isActive === false
    ) {
        console.log('[DOCTOR LOGIN] Doctor not approved/active', {
            status: registration.status,
            isActive: registration.isActive
        });

        return {
            error: [
                403,
                'Doctor registration is not approved or active.'
            ]
        };
    }

    const user = database.users[registration.userId];

    if (!user) {
        console.log('[DOCTOR LOGIN] User account not found');

        return {
            error: [403, 'Doctor account is unavailable.']
        };
    }

    user.status = 'APPROVED';
    user.isActive = true;

    const accessToken = authService.createAccessToken(user);

    return {
        data: {
            accessToken,
            user
        }
    };
}
function getProfile(userId) {
	const registration = findRegistration(userId);
	if (!registration) return null;
	return toDoctorProfile(registration, database.doctors.find(item => item.id === registration.userId));
}

function getStatus(userId) {
	const registration = findRegistration(userId);
	if (!registration) return null;
	return { status: registration.status, isActive: registration.isActive === true, rejectionReason: registration.rejectionReason || null };
}

function updateProfile(userId, input) {
	const registration = findRegistration(userId);
	if (!registration) return { error: [404, 'Doctor profile not found.'] };
	const validationError = validateProfileUpdate(input);
	if (validationError) return { error: [400, validationError] };
	const fields = {
		name: input.name,
		mobile: input.mobile || input.phone,
		specialization: input.specialization || input.specialty,
		qualification: input.qualification,
		experience: input.experience,
		registrationNumber: input.registrationNumber || input.registration_number,
		clinicName: input.clinicName || input.clinic_name,
		clinicAddress: input.clinicAddress || input.clinic_address,
		bio: input.bio
	};
	Object.entries(fields).forEach(([key, value]) => {
		if (value !== undefined) registration[key] = typeof value === 'string' ? value.trim() : value;
	});
	const user = database.users[userId];
	if (user) { user.name = registration.name; user.phone = registration.mobile; }
	const doctor = database.doctors.find(item => item.id === userId);
	if (doctor) Object.assign(doctor, { name: registration.name, specialty: registration.specialization, qualification: registration.qualification, experience_years: registration.experience, registration_number: registration.registrationNumber, clinic_name: registration.clinicName, clinic_address: registration.clinicAddress, about: registration.bio });
	return { data: toDoctorProfile(registration, doctor) };
}

module.exports = { STATUSES, publicRegistration, findRegistration, toDoctorProfile, register, login, getProfile, getStatus, updateProfile };