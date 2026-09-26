const crypto = require('crypto');

const database = require('../../database/database');
const authService = require('../auth/auth.service');

const {
	hashPassword,
	verifyPassword
} = require('../../utils/password');

const {
	clean,
	validateRegistration,
	validateProfileUpdate
} = require('./doctor.validation');


const STATUSES = new Set([
	'PENDING',
	'APPROVED',
	'REJECTED'
]);


// =====================================================
// REGISTRATION HELPERS
// =====================================================

function publicRegistration(registration) {
	const {
		passwordHash,
		...safeRegistration
	} = registration;

	return safeRegistration;
}

function findRegistration(id) {
	return database.doctorRegistrations.find(
		item =>
			item.id === id ||
			item.userId === id
	) || null;
}

function findByEmailOrMobile(email, mobile) {
	return database.doctorRegistrations.find(
		item =>
			item.email === email ||
			item.mobile === mobile
	) || null;
}


// =====================================================
// DOCTOR PROFILE
// =====================================================

function toDoctorProfile(registration, doctor) {
	const source = doctor || registration;

	return {
		id: registration.userId || registration.id,
		name: source.name || null,
		email: registration.email || null,
		mobile: registration.mobile || null,

		specialization:
			source.specialization ||
			source.specialty ||
			null,

		qualification:
			source.qualification ||
			null,

		experience:
			source.experience ??
			source.experience_years ??
			null,

		registrationNumber:
			source.registrationNumber ||
			source.registration_number ||
			null,

		clinicName:
			source.clinicName ||
			source.clinic_name ||
			null,

		clinicAddress:
			source.clinicAddress ||
			source.clinic_address ||
			null,

		bio:
			source.bio ||
			source.about ||
			null,

		status: registration.status,

		isActive:
			doctor
				? doctor.is_active !== false
				: registration.status === 'APPROVED',

		registrationDate:
			registration.registrationDate
	};
}


// =====================================================
// DOCTOR REGISTRATION
// =====================================================

function register(input) {

	const email = clean(input.email).toLowerCase();

	const mobile = clean(
		input.mobile || input.phone
	).replace(/[\s-]/g, '');

	const existing =
		findByEmailOrMobile(email, mobile) ||
		Object.values(database.users).find(
			user =>
				user.email === email ||
				user.phone === mobile
		);

	const validationError =
		validateRegistration(
			input,
			existing
		);

	if (validationError) {
		return {
			error: [400, validationError]
		};
	}

	const id = `doc_${crypto.randomUUID()}`;

	const registration = {

		id,

		userId: id,

		name: clean(input.name),

		email,

		mobile,

		specialization:
			clean(
				input.specialization ||
				input.specialty
			),

		qualification:
			clean(input.qualification),

		experience:
			input.experience === undefined ||
			input.experience === ''
				? null
				: Number(input.experience),

		registrationNumber:
			clean(
				input.registrationNumber ||
				input.registration_number
			),

		clinicName:
			clean(
				input.clinicName ||
				input.clinic_name
			),

		clinicAddress:
			clean(
				input.clinicAddress ||
				input.clinic_address
			),

		bio:
			clean(input.bio),

		status: 'PENDING',

		registrationDate:
			new Date().toISOString(),

		passwordHash:
			hashPassword(input.password),

		rejectionReason: null,

		isActive: false
	};

	database.doctorRegistrations.push(
		registration
	);

	database.users[id] = {
		id,
		phone: mobile,
		email,
		role: 'DOCTOR',
		name: registration.name,
		status: 'PENDING',
		isActive: false,
		isProfileCompleted: true
	};

	return {
		data: publicRegistration(
			registration
		)
	};
}


// =====================================================
// DOCTOR LOGIN
// =====================================================

function login(emailInput, password) {

	const email =
		clean(emailInput).toLowerCase();

	const registration =
		database.doctorRegistrations.find(
			item => item.email === email
		);

	console.log(
		'[DOCTOR LOGIN] Email:',
		email
	);

	console.log(
		'[DOCTOR LOGIN] Registration found:',
		!!registration
	);

	if (!registration) {
		return {
			error: [
				401,
				'Doctor account not found for this email.'
			]
		};
	}

	console.log(
		'[DOCTOR LOGIN] Password hash exists:',
		!!registration.passwordHash
	);

	const passwordValid =
		verifyPassword(
			String(password || ''),
			registration.passwordHash
		);

	console.log(
		'[DOCTOR LOGIN] Password valid:',
		passwordValid
	);

	if (!passwordValid) {
		return {
			error: [
				401,
				'Password is incorrect.'
			]
		};
	}

	console.log(
		'[DOCTOR LOGIN] Status:',
		registration.status
	);

	console.log(
		'[DOCTOR LOGIN] Active:',
		registration.isActive
	);

	if (
		registration.status !== 'APPROVED' ||
		registration.isActive === false
	) {
		return {
			error: [
				403,
				'Doctor registration is not approved or active.'
			]
		};
	}

	const user =
		database.users[
			registration.userId
		];

	if (!user) {
		return {
			error: [
				403,
				'Doctor account is unavailable.'
			]
		};
	}

	user.status = 'APPROVED';
	user.isActive = true;

	const accessToken =
		authService.createAccessToken(
			user
		);

	return {
		data: {
			accessToken,
			user
		}
	};
}


// =====================================================
// GET PROFILE
// =====================================================

function getProfile(userId) {

	const registration =
		findRegistration(userId);

	if (!registration) {
		return null;
	}

	const doctor =
		database.doctors.find(
			item =>
				item.id ===
				registration.userId
		);

	return toDoctorProfile(
		registration,
		doctor
	);
}


// =====================================================
// GET DOCTOR STATUS
// =====================================================

function getStatus(userId) {

	const registration =
		findRegistration(userId);

	if (!registration) {
		return null;
	}

	return {
		status: registration.status,

		isActive:
			registration.isActive === true,

		rejectionReason:
			registration.rejectionReason ||
			null
	};
}


// =====================================================
// UPDATE DOCTOR PROFILE
// =====================================================

function updateProfile(userId, input) {

	const registration =
		findRegistration(userId);

	if (!registration) {
		return {
			error: [
				404,
				'Doctor profile not found.'
			]
		};
	}

	const validationError =
		validateProfileUpdate(input);

	if (validationError) {
		return {
			error: [
				400,
				validationError
			]
		};
	}

	const fields = {

		name: input.name,

		mobile:
			input.mobile ||
			input.phone,

		specialization:
			input.specialization ||
			input.specialty,

		qualification:
			input.qualification,

		experience:
			input.experience,

		registrationNumber:
			input.registrationNumber ||
			input.registration_number,

		clinicName:
			input.clinicName ||
			input.clinic_name,

		clinicAddress:
			input.clinicAddress ||
			input.clinic_address,

		bio:
			input.bio
	};

	Object.entries(fields).forEach(
		([key, value]) => {

			if (value !== undefined) {

				registration[key] =
					typeof value === 'string'
						? value.trim()
						: value;
			}
		}
	);

	const user =
		database.users[userId];

	if (user) {

		user.name =
			registration.name;

		user.phone =
			registration.mobile;
	}

	const doctor =
		database.doctors.find(
			item =>
				item.id === userId
		);

	if (doctor) {

		Object.assign(
			doctor,
			{
				name:
					registration.name,

				specialty:
					registration.specialization,

				qualification:
					registration.qualification,

				experience_years:
					registration.experience,

				registration_number:
					registration.registrationNumber,

				clinic_name:
					registration.clinicName,

				clinic_address:
					registration.clinicAddress,

				about:
					registration.bio
			}
		);
	}

	return {
		data:
			toDoctorProfile(
				registration,
				doctor
			)
	};
}


// =====================================================
// DOCTOR APPOINTMENTS
// =====================================================

function getAppointments(doctorId) {

	return database.appointments.filter(
		appointment =>
			appointment.doctorId === doctorId
	);
}


function getAppointment(
	doctorId,
	appointmentId
) {

	const appointment =
		database.appointments.find(
			item =>
				item.id === appointmentId &&
				item.doctorId === doctorId
		);

	return appointment || null;
}


function updateAppointmentStatus(
	doctorId,
	appointmentId,
	status
) {

	const allowedStatuses =
		new Set([
			'PENDING',
			'CONFIRMED',
			'ACCEPTED',
			'REJECTED',
			'CANCELLED',
			'COMPLETED'
		]);

	if (!allowedStatuses.has(status)) {

		return {
			error: [
				400,
				'Invalid appointment status.'
			]
		};
	}

	const appointment =
		database.appointments.find(
			item =>
				item.id === appointmentId &&
				item.doctorId === doctorId
		);

	if (!appointment) {
		return null;
	}

	appointment.status = status;

	return appointment;
}


// =====================================================
// DOCTOR PATIENTS
// =====================================================

function getPatients(doctorId) {

	const appointments =
		database.appointments.filter(
			appointment =>
				appointment.doctorId === doctorId
		);

	const patientIds = [
		...new Set(
			appointments
				.map(
					appointment =>
						appointment.patientId
				)
				.filter(Boolean)
		)
	];

	return patientIds
		.map(
			patientId =>
				database.users[patientId]
		)
		.filter(
			user =>
				user &&
				user.role === 'PATIENT'
		);
}


function getPatient(
	doctorId,
	patientId
) {

	const hasAppointment =
		database.appointments.some(
			appointment =>
				appointment.doctorId === doctorId &&
				appointment.patientId === patientId
		);

	if (!hasAppointment) {
		return null;
	}

	const patient =
		database.users[patientId];

	if (
		!patient ||
		patient.role !== 'PATIENT'
	) {
		return null;
	}

	return patient;
}


// =====================================================
// EXPORTS
// =====================================================

module.exports = {

	STATUSES,

	publicRegistration,

	findRegistration,

	toDoctorProfile,

	register,

	login,

	getProfile,

	getStatus,

	updateProfile,

	getAppointments,

	getAppointment,

	updateAppointmentStatus,

	getPatients,

	getPatient
};