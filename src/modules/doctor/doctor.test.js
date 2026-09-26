const test = require('node:test');
const assert = require('node:assert/strict');

const database = require('../../database/database');
const doctorService = require('./doctor.service');

function resetDatabase() {
  database.doctorRegistrations = [];
  database.users = {};
  database.appointments = [];
  database.doctors = [];
  database.profiles = {};
}

test('doctor portal blocks pending registration from login', () => {
  resetDatabase();

  const registration = doctorService.register({
    name: 'Dr. Neha Verma',
    email: 'neha.verma@example.com',
    mobile: '9123456780',
    password: 'Neha@12345',
    specialization: 'Dermatologist',
    qualification: 'MBBS, MD',
    experience: 6,
    registrationNumber: 'MP789456',
    clinicName: 'Verma Skin Care Clinic',
    clinicAddress: 'Scheme No. 54, Indore, Madhya Pradesh',
    bio: 'Experienced dermatologist.'
  });

  assert.equal(registration.error, undefined);
  assert.equal(registration.data.status, 'PENDING');

  const loginResult = doctorService.loginPortal('neha.verma@example.com', 'Neha@12345');
  assert.equal(loginResult.error[0], 403);
  assert.match(loginResult.error[1], /approved|active/i);
});

test('approved active doctor can login and read own profile', () => {
  resetDatabase();

  const created = doctorService.register({
    name: 'Dr. Neha Verma',
    email: 'neha.verma@example.com',
    mobile: '9123456780',
    password: 'Neha@12345',
    specialization: 'Dermatologist',
    qualification: 'MBBS, MD',
    experience: 6,
    registrationNumber: 'MP789456',
    clinicName: 'Verma Skin Care Clinic',
    clinicAddress: 'Scheme No. 54, Indore, Madhya Pradesh',
    bio: 'Experienced dermatologist.'
  });

  const registration = database.doctorRegistrations[0];
  registration.status = 'APPROVED';
  registration.isActive = true;
  database.users[registration.userId].status = 'APPROVED';
  database.users[registration.userId].isActive = true;

  const loginResult = doctorService.loginPortal('neha.verma@example.com', 'Neha@12345');
  assert.equal(loginResult.error, undefined);
  assert.equal(loginResult.data.user.role, 'DOCTOR');
  assert.equal(loginResult.data.user.id, registration.userId);

  const profile = doctorService.getProfile(registration.userId);
  assert.equal(profile.name, 'Dr. Neha Verma');
  assert.equal(profile.status, 'APPROVED');
});
