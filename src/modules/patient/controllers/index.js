module.exports = {
    auth: require('../../auth/auth.controller'),
    profile: require('../profile/profile.controller'),
    doctors: require('../doctors/doctor.controller'),
    appointments: require('../appointments/appointment.controller'),
    home: require('../home/home.controller')
};