const database = require('../../database/database');

function getLiveQueue(req, res) {
    try {
        let doctor = database.doctors.find(item => item.id === database.liveDoctorId);
        if (!doctor) doctor = database.doctors.find(item => item.is_online === true);
        if (!doctor) return res.status(404).json({ success: false, message: 'No doctor is currently available.' });
        const queue = database.liveQueue;
        return res.status(200).json({
            success: true,
            consultation_id: `live_${doctor.id}_${queue.patientId}`,
            doctor: {
                id: doctor.id, name: doctor.name, specialty: doctor.specialty,
                clinic_name: doctor.clinic_name, registration_number: doctor.registration_number,
                rating: doctor.rating, experience_years: doctor.experience_years,
                consultation_fee: doctor.consultation_fee, is_online: Boolean(doctor.is_online)
            },
            current_serving_token: queue.currentServingToken,
            waiting_count: queue.waitingCount,
            user_token: queue.userToken,
            estimated_wait_minutes: queue.estimatedWaitMinutes,
            is_user_turn: queue.isUserTurn,
            upcoming_queue: queue.upcomingQueue
        });
    } catch (error) {
        console.error('[QUEUE] LIVE QUEUE FAILED:', error);
        return res.status(500).json({ success: false, message: 'Unable to load live queue.' });
    }
}

module.exports = { getLiveQueue };
