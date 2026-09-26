const database = {
    doctors: [
        {
            id: 'doc_101',
            name: 'Dr. Rajesh Kumar',
            specialty: 'General Physician & Cardiologist',
            clinic_name: 'Apollo Health Clinic',
            registration_number: 'MCI-48291',
            rating: 4.9,
            experience_years: 14,
            consultation_fee: 650,
            consultation_fee: 500,
            is_online: true,
            is_verified: true,
            is_active: true,
            profile_image: null,
            review_count: 0,
            location: null,
            latitude: null,
            longitude: null,
            schedule: [
                { daysOfWeek: [0, 1, 2, 3, 4, 5, 6], startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 },
                { daysOfWeek: [0, 1, 2, 3, 4, 5, 6], startTime: '14:00', endTime: '17:00', slotDurationMinutes: 30 }
            ]
        },
        {
            id: 'doc_102',
            name: 'Dr. Priya Sharma',
            specialty: 'Dermatologist & Cosmetologist',
            clinic_name: 'Skin & Care Clinic',
            registration_number: 'DMC-83921',
            rating: 4.8,
            experience_years: 9,
            consultation_fee: 650,
            is_online: true,
            is_verified: true,
            is_active: true,
            profile_image: null,
            review_count: 0,
            location: null,
            latitude: null,
            longitude: null
        }
    ],
    liveDoctorId: 'doc_101',
    liveQueue: {
        currentServingToken: 12,
        waitingCount: 2,
        userToken: 14,
        patientId: 'pat_789',
        estimatedWaitMinutes: 6,
        isUserTurn: true,
        upcomingQueue: [
            { token_number: 12, patient_name: 'Amit Patel', is_user: false, status: 'In Consultation' },
            { token_number: 13, patient_name: 'Sunita Verma', is_user: false, status: 'Next' },
            { token_number: 14, patient_name: 'Patient', is_user: true, status: 'Waiting' },
            { token_number: 15, patient_name: 'Deepak Joshi', is_user: false, status: 'Waiting' }
        ]
    },
    users: {},
    doctorRegistrations: [],
    refreshTokens: [],
    doctorSlots: [],
    appointments: [],
    callSessions: [],
    payments: [],
    profiles: {},
    consultations: {},
    orders: {},
    prescriptions: [],
    medicines: [],
    notifications: [],
    specialties: [
        { id: 'general-physician', name: 'General Physician', icon: null },
        { id: 'cardiology', name: 'Cardiology', icon: null },
        { id: 'dermatology', name: 'Dermatology', icon: null },
        { id: 'pediatrics', name: 'Pediatrics', icon: null },
        { id: 'neurology', name: 'Neurology', icon: null },
        { id: 'gynecology', name: 'Gynecology', icon: null },
        { id: 'dentistry', name: 'Dentistry', icon: null }
    ],
    healthServices: [
        { id: 'pharmacy', title: 'Pharmacy', subtitle: 'Order medicines', type: 'PHARMACY', enabled: true },
        { id: 'prescriptions', title: 'Prescriptions', subtitle: 'View your prescriptions', type: 'PRESCRIPTIONS', enabled: true },
        { id: 'appointments', title: 'Appointments', subtitle: 'Manage consultations', type: 'APPOINTMENTS', enabled: true },
        { id: 'video-consultation', title: 'Video Consultation', subtitle: 'Talk to a doctor online', type: 'VIDEO_CONSULTATION', enabled: true },
        { id: 'health-records', title: 'Health Records', subtitle: 'Access your medical records', type: 'HEALTH_RECORDS', enabled: true }
    ]
};

database.users.doc_101 = {
    id: 'doc_101',
    phone: '+919876543210',
    role: 'DOCTOR',
    name: 'Dr. Rajesh Kumar',
    isProfileCompleted: false
};

database.users.pat_789 = {
    id: 'pat_789',
    phone: '+919876543211',
    role: 'PATIENT',
    name: 'Patient',
    isProfileCompleted: false
};

module.exports = database;
