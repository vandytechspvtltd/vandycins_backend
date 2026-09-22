const swaggerDefinition = {
    openapi: '3.0.3',
    info: {
        title: 'Vandycins Backend API',
        version: '2.0.0',
        description: 'OpenAPI documentation for the implemented Telehealth REST API.'
    },
    servers: [
        { url: 'https://vandycinsapis.vandymondglobal.in', description: 'Production server' },
        { url: 'http://localhost:5000', description: 'Local server' }
    ],
    tags: [
        { name: 'System', description: 'Service health' },
        { name: 'Auth', description: 'Phone OTP authentication and session management' },
        { name: 'Profile', description: 'Authenticated patient profile' },
        { name: 'Home', description: 'Authenticated patient home data' },
        { name: 'Doctors', description: 'Doctor directory' },
        { name: 'Specialties', description: 'Medical specialties' },
        { name: 'Health Services', description: 'Available health services' },
        { name: 'Queue', description: 'Live consultation queue' },
        { name: 'Consultations', description: 'Consultation scheduling and lifecycle' },
        { name: 'Pharmacy', description: 'Medicine catalog and orders' },
        { name: 'Prescriptions', description: 'Doctor prescriptions' },
        { name: 'Orders', description: 'Medicine order tracking' }
        , { name: 'Appointments', description: 'Patient appointment booking and management' }
        , { name: 'Notifications', description: 'Patient notification summaries' }
    ],
    components: {
        securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
        },
        schemas: {
            Error: {
                type: 'object', required: ['success', 'message'],
                properties: { success: { type: 'boolean', example: false }, message: { type: 'string' }, cooldown_seconds: { type: 'integer' }, remaining_attempts: { type: 'integer' } }
            },
            User: {
                type: 'object', properties: {
                    id: { type: 'string' }, phone: { type: 'string' }, role: { type: 'string', enum: ['PATIENT', 'DOCTOR'] }, name: { type: 'string' }, isProfileCompleted: { type: 'boolean' }
                }
            },
            AuthResponse: {
                type: 'object', required: ['success', 'data'],
                properties: {
                    success: { type: 'boolean' }, data: { type: 'object', required: ['accessToken', 'refreshToken', 'user'], properties: { accessToken: { type: 'string' }, refreshToken: { type: 'string' }, user: { $ref: '#/components/schemas/User' } } }, access_token: { type: 'string' }, refresh_token: { type: 'string' }, user_id: { type: 'string' }, name: { type: 'string' }, phone: { type: 'string' }, role: { type: 'string', enum: ['PATIENT', 'DOCTOR'] }, is_profile_completed: { type: 'boolean' }
                }
            },
            Profile: {
                type: 'object', required: ['name', 'gender', 'bloodGroup', 'age', 'email'],
                properties: {
                    name: { type: 'string' }, gender: { type: 'string', enum: ['MALE', 'FEMALE', 'OTHER'] }, bloodGroup: { type: 'string', enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] }, age: { type: 'integer', minimum: 0, example: 21 }, email: { type: 'string', format: 'email' }, image: { type: 'string', nullable: true }
                }
            },
            Doctor: {
                type: 'object', properties: {
                    id: { type: 'string' }, name: { type: 'string' }, profile_image: { type: 'string', nullable: true }, avatar: { type: 'string', nullable: true }, specialty: { type: 'string', nullable: true }, qualification: { type: 'string', nullable: true }, experience_years: { type: 'integer', nullable: true }, experienceYears: { type: 'integer', nullable: true }, rating: { type: 'number' }, review_count: { type: 'integer' }, reviewCount: { type: 'integer' }, consultation_fee: { type: 'number', nullable: true }, consultationFee: { type: 'number', nullable: true }, is_online: { type: 'boolean' }, isOnline: { type: 'boolean' }, isVerified: { type: 'boolean' }, clinicName: { type: 'string', nullable: true }, clinicAddress: { type: 'string', nullable: true }, location: {}, distance_km: { type: 'number', nullable: true }, distanceKm: { type: 'number', nullable: true }, registrationNumber: { type: 'string', nullable: true }, about: { type: 'string', nullable: true }
                }
            },
            Appointment: {
                type: 'object', properties: {
                    id: { type: 'string' }, appointmentId: { type: 'string' }, doctorId: { type: 'string' }, slotId: { type: 'string' }, doctorName: { type: 'string', nullable: true }, doctorAvatar: { type: 'string', nullable: true }, doctorSpecialty: { type: 'string', nullable: true }, type: { type: 'string', enum: ['VIDEO', 'AUDIO', 'CHAT'] }, consultationType: { type: 'string', example: 'VIDEO' }, status: { type: 'string', enum: ['PENDING_PAYMENT', 'UPCOMING', 'COMPLETED', 'CANCELLED'] }, date: { type: 'string', format: 'date', nullable: true }, time: { type: 'string', nullable: true }, symptoms: { type: 'string', nullable: true }, prescriptionId: { type: 'string', nullable: true }, consultationFee: { type: 'number' }, platformFee: { type: 'number' }, totalAmount: { type: 'number' }, fees: { type: 'object', properties: { consultationFee: { type: 'number' }, platformFee: { type: 'number' }, totalAmount: { type: 'number' } } }, paymentId: { type: 'string', nullable: true }, paymentStatus: { type: 'string', enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'] }
                }
            },
            Medicine: {
                type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, dosage: { type: 'string' }, frequency: { type: 'string' }, duration: { type: 'string' }, instructions: { type: 'string' } }
            },
            Prescription: {
                type: 'object', properties: {
                    id: { type: 'string' }, patient_id: { type: 'string' }, patientId: { type: 'string' }, doctor_id: { type: 'string' }, doctorId: { type: 'string' }, doctor_name: { type: 'string' }, doctorName: { type: 'string', nullable: true }, doctor_specialty: { type: 'string', nullable: true }, doctorSpecialty: { type: 'string', nullable: true }, doctor_registration_number: { type: 'string', nullable: true }, doctorReg: { type: 'string', nullable: true }, date: { type: 'string', format: 'date-time' }, diagnosis: { type: 'string' }, medicines: { type: 'array', items: { $ref: '#/components/schemas/Medicine' } }
                }
            },
            Consultation: {
                type: 'object', properties: {
                    consultation_id: { type: 'string' }, doctor_id: { type: 'string' }, patient_id: { type: 'string' }, doctor_name: { type: 'string' }, doctor_specialty: { type: 'string' }, patient_name: { type: 'string' }, channel_name: { type: 'string' }, scheduled_at: { type: 'string', nullable: true }, status: { type: 'string' }, created_at: { type: 'string', format: 'date-time' }
                }
            },
            Order: {
                type: 'object', properties: { id: { type: 'string' }, user_id: { type: 'string' }, items: { type: 'array', items: {} }, status: { type: 'string', enum: ['PLACED'] }, created_at: { type: 'string', format: 'date-time' } }
            },
            HomeResponse: {
                type: 'object', properties: {
                    patient: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, phone: { type: 'string' }, email: { type: 'string' }, avatar: { type: 'string', nullable: true }, city: { type: 'string' } } },
                    location: { type: 'object', properties: { city: { type: 'string' }, latitude: { type: 'number', nullable: true }, longitude: { type: 'number', nullable: true } } },
                    notifications: { type: 'object', properties: { unreadCount: { type: 'integer' } } },
                    specialities: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, icon: { type: 'string', nullable: true } } } },
                    upcomingAppointment: { allOf: [{ $ref: '#/components/schemas/Appointment' }], nullable: true },
                    nearbyDoctors: { type: 'array', items: { $ref: '#/components/schemas/Doctor' } },
                    previousAppointments: { type: 'array', items: { $ref: '#/components/schemas/Appointment' } },
                    recentPrescriptions: { type: 'array', items: { $ref: '#/components/schemas/Prescription' } }
                }
            },
            DoctorProfile: {
                allOf: [{ $ref: '#/components/schemas/Doctor' }],
                properties: {
                    availableSlots: { type: 'array', items: { $ref: '#/components/schemas/AppointmentSlot' } },
                    reviews: { type: 'array', items: { type: 'object', additionalProperties: true } }
                }
            },
            AppointmentSlot: {
                type: 'object', properties: {
                    id: { type: 'string' }, doctorId: { type: 'string' }, date: { type: 'string', format: 'date' }, time: { type: 'string', example: '09:00' }, period: { type: 'string', enum: ['AM', 'PM'], nullable: true }, available: { type: 'boolean' }, bookedAppointmentId: { type: 'string', nullable: true }
                }
            },
            Payment: {
                type: 'object', properties: {
                    id: { type: 'string' }, appointmentId: { type: 'string' }, amount: { type: 'integer' }, method: { type: 'string', enum: ['UPI', 'CARD', 'NET_BANKING', 'WALLET'] }, status: { type: 'string', enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'] }, transactionReference: { type: 'string', nullable: true }, refundStatus: { type: 'string', nullable: true }
                }
            }
        }
    },
    paths: {
        '/health': { get: { tags: ['System'], summary: 'Check service health', description: 'Returns service and configuration availability flags.', responses: { 200: { description: 'Service health' } } } },
        '/v1/health': { get: { tags: ['System'], summary: 'Check service health', description: 'Returns service and configuration availability flags.', responses: { 200: { description: 'Service health' } } } },
        '/v1/auth/send-otp': { post: { tags: ['Auth'], summary: 'Send OTP', description: 'Sends a four-digit OTP to a registered phone number.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['phone', 'role'], properties: { phone: { type: 'string', example: '+919876543211' }, role: { type: 'string', enum: ['PATIENT', 'DOCTOR'] } } } } } }, responses: { 200: { description: 'OTP sent' }, 400: { $ref: '#/components/responses/BadRequest' }, 404: { $ref: '#/components/responses/NotFound' }, 429: { $ref: '#/components/responses/TooManyRequests' }, 500: { $ref: '#/components/responses/ServerError' } } } },
        '/v1/auth/verify-otp': { post: { tags: ['Auth'], summary: 'Verify OTP and issue tokens', description: 'Verifies the four-digit OTP and returns access and refresh tokens.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['phone', 'otp', 'role'], properties: { phone: { type: 'string' }, otp: { type: 'string', pattern: '^\\d{4}$' }, role: { type: 'string', enum: ['PATIENT', 'DOCTOR'] } } } } } }, responses: { 200: { description: 'Authenticated user', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } }, 400: { $ref: '#/components/responses/BadRequest' }, 401: { $ref: '#/components/responses/Unauthorized' }, 429: { $ref: '#/components/responses/TooManyRequests' }, 500: { $ref: '#/components/responses/ServerError' } } } },
        '/v1/auth/refresh': { post: { tags: ['Auth'], summary: 'Rotate refresh token', description: 'Validates and rotates a refresh token. The submitted token is revoked after a successful rotation.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } } } } }, responses: { 200: { description: 'New access and refresh tokens', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } }, 401: { description: 'Invalid, expired, or revoked refresh token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, example: { success: false, message: 'Invalid or expired refresh token' } } } } } } },
        '/v1/auth/refresh-token': { post: { tags: ['Auth'], summary: 'Rotate refresh token (legacy alias)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } } } } }, responses: { 200: { description: 'New tokens', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } }, 401: { $ref: '#/components/responses/Unauthorized' } } } },
        '/v1/auth/logout': { post: { tags: ['Auth'], summary: 'Revoke refresh session', description: 'Revokes the supplied refresh token. Supplying no token revokes all sessions for an authenticated caller.', requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { refreshToken: { type: 'string' } } } } } }, responses: { 200: { description: 'Logged out' }, 401: { $ref: '#/components/responses/Unauthorized' } } } },
        '/v1/profile': { get: { tags: ['Profile'], summary: 'Get profile', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Profile returned' }, 401: { $ref: '#/components/responses/Unauthorized' } } }, post: { tags: ['Profile'], summary: 'Create profile', security: [{ bearerAuth: [] }], requestBody: { $ref: '#/components/requestBodies/Profile' }, responses: { 200: { $ref: '#/components/responses/ProfileSaved' }, 400: { $ref: '#/components/responses/BadRequest' }, 401: { $ref: '#/components/responses/Unauthorized' } } }, put: { tags: ['Profile'], summary: 'Update profile', security: [{ bearerAuth: [] }], requestBody: { $ref: '#/components/requestBodies/Profile' }, responses: { 200: { $ref: '#/components/responses/ProfileSaved' }, 400: { $ref: '#/components/responses/BadRequest' }, 401: { $ref: '#/components/responses/Unauthorized' } } } },
        '/v1/home': { get: { tags: ['Home'], summary: 'Fetch home data', description: 'Returns patient-specific home dashboard data.', security: [{ bearerAuth: [] }], responses: { 200: { $ref: '#/components/responses/Home' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' }, 500: { $ref: '#/components/responses/ServerError' } } } },
        '/api/home': { get: { tags: ['Home'], summary: 'Fetch home data', description: 'Alias of the patient home dashboard endpoint.', security: [{ bearerAuth: [] }], responses: { 200: { $ref: '#/components/responses/Home' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' }, 500: { $ref: '#/components/responses/ServerError' } } } },
        '/v1/doctors': { get: { tags: ['Doctors'], summary: 'List doctors', description: 'Lists doctors with optional text, specialty, location, rating, fee, experience, and online filters.', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/Search' }, { name: 'specialty', in: 'query', schema: { type: 'string', enum: ['general physician', 'cardiology', 'dermatology', 'pediatrics', 'neurology'] } }, { name: 'latitude', in: 'query', schema: { type: 'number', minimum: -90, maximum: 90 } }, { name: 'longitude', in: 'query', schema: { type: 'number', minimum: -180, maximum: 180 } }, { name: 'maxDistance', in: 'query', schema: { type: 'number', minimum: 0 } }, { name: 'minRating', in: 'query', schema: { type: 'number', minimum: 0, maximum: 5 } }, { name: 'maxFee', in: 'query', schema: { type: 'number', minimum: 0 } }, { name: 'minExperience', in: 'query', schema: { type: 'number', minimum: 0 } }, { name: 'onlineOnly', in: 'query', schema: { type: 'boolean', default: false } }, { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } }, { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0, default: 0 } }], responses: { 200: { description: 'Doctor list' }, 400: { $ref: '#/components/responses/BadRequest' }, 401: { $ref: '#/components/responses/Unauthorized' } } } },
        '/v1/doctors/{doctorId}': { get: { tags: ['Doctors'], summary: 'Get doctor profile', security: [{ bearerAuth: [] }], parameters: [{ name: 'doctorId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Doctor profile', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/DoctorProfile' } } } } } }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } } } },
        '/v1/doctors/{doctorId}/slots': {
            get: {
                tags: ['Doctors'],
                summary: 'Get doctor slots',
                description: 'Returns slots generated from the doctor working schedule for the requested date, including unavailable booked slots.',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'doctorId', in: 'path', required: true, schema: { type: 'string' }, example: 'doc_101' },
                    { name: 'date', in: 'query', required: true, schema: { type: 'string', format: 'date' }, example: '2026-10-02' }
                ],
                responses: {
                    200: {
                        description: 'Doctor slots',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['success', 'data'],
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            required: ['doctorId', 'date', 'slots'],
                                            properties: {
                                                doctorId: { type: 'string' },
                                                date: { type: 'string', format: 'date' },
                                                slots: { type: 'array', items: { $ref: '#/components/schemas/AppointmentSlot' } }
                                            }
                                        }
                                    }
                                },
                                example: {
                                    success: true,
                                    data: {
                                        doctorId: 'doc_101',
                                        date: '2026-10-02',
                                        slots: [{ id: 'doc_101_2026-10-02_0900', doctorId: 'doc_101', date: '2026-10-02', time: '09:00', period: 'AM', available: true, bookedAppointmentId: null }]
                                    }
                                }
                            }
                        }
                    },
                    400: { $ref: '#/components/responses/BadRequest' },
                    401: { $ref: '#/components/responses/Unauthorized' },
                    404: { $ref: '#/components/responses/NotFound' }
                }
            }
        },
        '/v1/specialties': { get: { tags: ['Specialties'], summary: 'List specialties', description: 'Returns configured specialties and doctor counts.', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Specialties' }, 401: { $ref: '#/components/responses/Unauthorized' } } } },
        '/v1/specialities': { get: { tags: ['Specialties'], summary: 'List specialities', description: 'Alias using the patient app spelling.', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Specialities' }, 401: { $ref: '#/components/responses/Unauthorized' } } } },
        '/v1/health-services': { get: { tags: ['Health Services'], summary: 'List health services', description: 'Returns enabled and configured health services.', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Health services' }, 401: { $ref: '#/components/responses/Unauthorized' } } } },
        '/v1/queue/live': { get: { tags: ['Queue'], summary: 'Get live queue', description: 'Returns the active doctor and current consultation queue.', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Live queue' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' }, 500: { $ref: '#/components/responses/ServerError' } } } },
        '/v1/consultations': { get: { tags: ['Consultations'], summary: 'List consultations', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Consultations' }, 401: { $ref: '#/components/responses/Unauthorized' }, 500: { $ref: '#/components/responses/ServerError' } } }, post: { tags: ['Consultations'], summary: 'Schedule consultation', description: 'Schedules a future consultation for a patient.', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['doctorId', 'scheduledAt'], properties: { id: { type: 'string' }, doctorId: { type: 'string' }, scheduledAt: { type: 'string', format: 'date-time' }, consultationType: { type: 'string', default: 'VIDEO' }, symptoms: { type: 'string' }, reason: { type: 'string' } } } } } }, responses: { 201: { description: 'Appointment scheduled' }, 400: { $ref: '#/components/responses/BadRequest' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' }, 409: { $ref: '#/components/responses/Conflict' } } } },
        '/v1/consultations/end': { post: { tags: ['Consultations'], summary: 'End consultation', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['consultation_id'], properties: { consultation_id: { type: 'string' }, duration_seconds: { type: 'number', minimum: 0, default: 0 } } } } } }, responses: { 200: { description: 'Consultation ended' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' } } } },
        '/v1/pharmacy/medicines': { get: { tags: ['Pharmacy'], summary: 'List medicines', description: 'Searches the medicine catalog by serialized medicine fields.', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/Search' }], responses: { 200: { description: 'Medicines' }, 401: { $ref: '#/components/responses/Unauthorized' } } } },
        '/v1/pharmacy/orders': { post: { tags: ['Pharmacy'], summary: 'Create medicine order', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['items'], properties: { items: { type: 'array', items: {} } } } } } }, responses: { 201: { description: 'Order placed' }, 401: { $ref: '#/components/responses/Unauthorized' } } } },
        '/v1/prescriptions': { get: { tags: ['Prescriptions'], summary: 'List patient prescriptions', description: 'Returns only prescriptions belonging to the authenticated patient.', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Patient prescriptions' }, 401: { $ref: '#/components/responses/Unauthorized' } } }, post: { tags: ['Prescriptions'], summary: 'Create prescription', description: 'Allows a doctor to issue a prescription to an existing patient.', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['patientId', 'diagnosis', 'medicines'], properties: { id: { type: 'string' }, patientId: { type: 'string' }, patient_id: { type: 'string' }, diagnosis: { type: 'string' }, medicines: { type: 'array', items: { $ref: '#/components/schemas/Medicine' } } } } } } }, responses: { 201: { description: 'Prescription created' }, 400: { $ref: '#/components/responses/BadRequest' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } } } },
        '/v1/prescriptions/latest': { get: { tags: ['Prescriptions'], summary: 'Get latest prescription', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Latest prescription' }, 401: { $ref: '#/components/responses/Unauthorized' } } } },
        '/v1/prescriptions/{id}': { get: { tags: ['Prescriptions'], summary: 'Get prescription by ID', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/Id' }], responses: { 200: { description: 'Prescription' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } } } },
        '/v1/orders/{id}/tracking': { get: { tags: ['Orders'], summary: 'Track order', security: [{ bearerAuth: [] }], parameters: [{ $ref: '#/components/parameters/Id' }], responses: { 200: { description: 'Order tracking' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } } } }
        , '/v1/appointments': {
            get: { tags: ['Appointments'], summary: 'List patient appointments', security: [{ bearerAuth: [] }], parameters: [{ name: 'status', in: 'query', schema: { type: 'string', enum: ['UPCOMING', 'COMPLETED', 'CANCELLED'] } }], responses: { 200: { description: 'Patient appointments' }, 401: { $ref: '#/components/responses/Unauthorized' } } },
            post: { tags: ['Appointments'], summary: 'Create appointment booking', description: 'Books the selected available doctor slot returned by GET /v1/doctors/{doctorId}/slots. slotId must be the slot object id, not the date. Use date or slotDate for the slot date.', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['doctorId', 'slotId', 'consultationType'], properties: { doctorId: { type: 'string', example: 'doc_101' }, slotId: { type: 'string', example: 'doc_101_2026-09-25_0900', description: 'Actual id returned by the slots API.' }, date: { type: 'string', format: 'date', example: '2026-09-25' }, slotDate: { type: 'string', format: 'date', example: '2026-09-25', description: 'Alias for date.' }, consultationType: { type: 'string', enum: ['VIDEO', 'AUDIO', 'CHAT'], example: 'VIDEO' }, symptoms: { type: 'string', nullable: true } }, example: { doctorId: 'doc_101', slotId: 'doc_101_2026-09-25_0900', date: '2026-09-25', consultationType: 'VIDEO', symptoms: 'string' } } } } }, responses: { 201: { description: 'Appointment created with pending payment', content: { 'application/json': { schema: { type: 'object', required: ['success', 'data'], properties: { success: { type: 'boolean', example: true }, message: { type: 'string' }, data: { $ref: '#/components/schemas/Appointment' } } } } } }, 400: { $ref: '#/components/responses/BadRequest' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' }, 404: { $ref: '#/components/responses/NotFound' }, 409: { $ref: '#/components/responses/Conflict' } } }
        },
        '/v1/appointments/{appointmentId}': { get: { tags: ['Appointments'], summary: 'Get patient appointment details', security: [{ bearerAuth: [] }], parameters: [{ name: 'appointmentId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Appointment details including fees and payment' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } } } },
        '/v1/appointments/{appointmentId}/payment': { post: { tags: ['Appointments'], summary: 'Initiate appointment payment', security: [{ bearerAuth: [] }], parameters: [{ name: 'appointmentId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['paymentMethod'], properties: { paymentMethod: { type: 'string', enum: ['UPI', 'CARD', 'NET_BANKING', 'WALLET'] } } } } } }, responses: { 201: { description: 'Pending payment record and provider order information' }, 400: { $ref: '#/components/responses/BadRequest' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' }, 409: { $ref: '#/components/responses/Conflict' } } } },
        '/v1/appointments/{appointmentId}/cancel': { post: { tags: ['Appointments'], summary: 'Cancel patient appointment', security: [{ bearerAuth: [] }], parameters: [{ name: 'appointmentId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { reason: { type: 'string', nullable: true } } } } } }, responses: { 200: { description: 'Appointment cancelled' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' }, 409: { $ref: '#/components/responses/Conflict' } } }, put: { tags: ['Appointments'], summary: 'Cancel patient appointment (legacy method)', security: [{ bearerAuth: [] }], parameters: [{ name: 'appointmentId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Appointment cancelled' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' }, 409: { $ref: '#/components/responses/Conflict' } } } },
        '/v1/notifications/unread-count': { get: { tags: ['Notifications'], summary: 'Get unread notification count', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Unread notification count' }, 401: { $ref: '#/components/responses/Unauthorized' } } } },
        '/v1/payments/webhook': { post: { tags: ['Appointments'], summary: 'Process payment webhook', description: 'Processes a verified provider webhook idempotently. Requires X-Payment-Signature when PAYMENT_WEBHOOK_SECRET is configured.', parameters: [{ name: 'X-Payment-Signature', in: 'header', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['paymentId', 'status'], properties: { paymentId: { type: 'string' }, status: { type: 'string', enum: ['SUCCESS', 'FAILED'] }, transactionReference: { type: 'string', nullable: true } } } } } }, responses: { 200: { description: 'Webhook processed' }, 400: { $ref: '#/components/responses/BadRequest' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' }, 409: { $ref: '#/components/responses/Conflict' }, 503: { $ref: '#/components/responses/ServiceUnavailable' } } } }
    }
};

swaggerDefinition.components.parameters = {
    Id: { name: 'id', in: 'path', required: true, description: 'Resource identifier', schema: { type: 'string' } },
    Search: { name: 'search', in: 'query', required: false, schema: { type: 'string' } }
};
swaggerDefinition.components.requestBodies = {
    Profile: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Profile' } } } }
};
swaggerDefinition.components.responses = {
    BadRequest: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
    Unauthorized: { description: 'Missing, invalid, or expired Bearer token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
    Forbidden: { description: 'Authenticated user is not allowed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
    NotFound: { description: 'Resource not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
    Conflict: { description: 'Resource conflict', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
    TooManyRequests: { description: 'Rate or OTP attempt limit reached', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
    ServiceUnavailable: { description: 'Authentication service is not configured', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
    ServerError: { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
    ProfileSaved: { description: 'Profile saved', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, profile: { $ref: '#/components/schemas/Profile' }, is_profile_completed: { type: 'boolean' } } } } } },
    Home: { description: 'Home dashboard', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string', example: 'Home data fetched successfully' }, data: { $ref: '#/components/schemas/HomeResponse' } } } } } }
};

module.exports = swaggerDefinition;