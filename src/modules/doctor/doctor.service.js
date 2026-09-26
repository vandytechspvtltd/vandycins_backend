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
        active: registration.isActive !== false,
        isActive: registration.isActive !== false,
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

function loginPortal(emailInput, password) {
    const email = clean(emailInput).toLowerCase();
    const registration = database.doctorRegistrations.find(item => item.email === email);

    if (!registration) {
        return { error: [401, 'Doctor account not found for this email.'] };
    }

    const passwordValid = verifyPassword(String(password || ''), registration.passwordHash);
    if (!passwordValid) {
        return { error: [401, 'Password is incorrect.'] };
    }

    if (registration.status !== 'APPROVED' || registration.isActive === false) {
        return { error: [403, 'Doctor registration is not approved or active.'] };
    }

    let user = database.users[registration.userId];
    if (!user) {
        user = { id: registration.userId, phone: registration.mobile, email: registration.email, role: 'DOCTOR', name: registration.name, status: 'APPROVED', isActive: true, isProfileCompleted: true };
        database.users[registration.userId] = user;
    }

    user.status = 'APPROVED';
    user.isActive = true;
    user.email = registration.email;
    user.phone = registration.mobile;
    user.name = registration.name;
    user.role = 'DOCTOR';
    user.isProfileCompleted = true;

    registration.isActive = true;
    const accessToken = authService.createAccessToken(user);
    const refreshToken = authService.createRefreshToken(user);
    return { data: { accessToken, refreshToken, user } };
}

function login(emailInput, password) {
    return loginPortal(emailInput, password);
}

function getProfile(userId) {
    const registration = findRegistration(userId);
    if (!registration) return null;
    return toDoctorProfile(registration, database.doctors.find(item => item.id === registration.userId));
}

function getStatus(userId) {
    const registration = findRegistration(userId);
    if (!registration) return null;
    return { doctorId: registration.userId, status: registration.status, active: registration.isActive !== false, isActive: registration.isActive !== false, rejectionReason: registration.rejectionReason || null };
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

function getDoctorAppointments(userId) {
    return database.appointments
        .filter(appointment => appointment.doctorId === userId)
        .map(appointment => ({
            id: appointment.id,
            patientId: appointment.patientId,
            patientName: database.users[appointment.patientId]?.name || 'Patient',
            date: appointment.date || '',
            time: appointment.time || '',
            type: appointment.consultationType || appointment.type || 'Video Consultation',
            status: appointment.status || 'PENDING'
        }));
}

function getDoctorAppointment(userId, appointmentId) {
    const appointment = database.appointments.find(item => item.id === appointmentId && item.doctorId === userId);
    if (!appointment) return null;
    return {
        ...appointment,
        patientName: database.users[appointment.patientId]?.name || 'Patient'
    };
}

function setDoctorAppointmentStatus(userId, appointmentId, nextStatus) {
    const appointment = database.appointments.find(item => item.id === appointmentId && item.doctorId === userId);
    if (!appointment) return { error: [404, 'Appointment not found.'] };

    const allowedTransitions = {
        PENDING_PAYMENT: new Set(['CONFIRMED']),
        UPCOMING: new Set(['CONFIRMED', 'COMPLETED']),
        CONFIRMED: new Set(['COMPLETED']),
        COMPLETED: new Set(),
        CANCELLED: new Set(),
        REJECTED: new Set()
    };

    if (!allowedTransitions[appointment.status]?.has(nextStatus)) {
        return { error: [409, 'Invalid appointment status transition.'] };
    }

    appointment.status = nextStatus;
    return { data: { ...appointment, patientName: database.users[appointment.patientId]?.name || 'Patient' } };
}

function getDoctorPatients(userId) {
    const patientIds = [...new Set(database.appointments.filter(item => item.doctorId === userId).map(item => item.patientId))];
    return patientIds.map(patientId => {
        const patient = database.users[patientId];
        return {
            id: patientId,
            name: patient?.name || 'Patient',
            patientName: patient?.name || 'Patient',
            email: patient?.email || null,
            mobile: patient?.phone || null,
            phone: patient?.phone || null,
            status: patient?.status || 'ACTIVE'
        };
    });
}

function getDoctorPatient(userId, patientId) {
    const hasAccess = database.appointments.some(item => item.doctorId === userId && item.patientId === patientId);
    if (!hasAccess) return null;
    const patient = database.users[patientId];
    if (!patient) return null;
    return {
        id: patientId,
        name: patient.name || 'Patient',
        patientName: patient.name || 'Patient',
        email: patient.email || null,
        mobile: patient.phone || null,
        phone: patient.phone || null,
        status: patient.status || 'ACTIVE'
    };
}

module.exports = {
    STATUSES,
    publicRegistration,
    findRegistration,
    toDoctorProfile,
    register,
    login,
    loginPortal,
    getProfile,
    getStatus,
    updateProfile,
    getDoctorAppointments,
    getDoctorAppointment,
    setDoctorAppointmentStatus,
    getDoctorPatients,
    getDoctorPatient
};