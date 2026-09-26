function clean(value) {
    return String(value || '').trim();
}

function validateRegistration(input, existing) {

    const email = clean(input.email).toLowerCase();
    const mobile = clean(input.mobile || input.phone);
    const name = clean(input.name);
    const password = String(input.password || '');

    if (!name) {
        return 'Name is required.';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return 'Valid email is required.';
    }

    if (!/^\+?[0-9]{10,15}$/.test(
        mobile.replace(/[\s-]/g, '')
    )) {
        return 'Valid mobile is required.';
    }

    if (password.length < 8) {
        return 'Password must be at least 8 characters.';
    }

    if (existing) {
        return 'A doctor registration already exists for this email or mobile.';
    }

    return null;
}


function validateProfileUpdate(input) {

    if (
        input.experience !== undefined &&
        input.experience !== null &&
        input.experience !== '' &&
        (
            !Number.isFinite(Number(input.experience)) ||
            Number(input.experience) < 0
        )
    ) {
        return 'Experience must be a valid positive number.';
    }

    if (
        input.mobile !== undefined &&
        !/^\+?[0-9]{10,15}$/.test(
            String(input.mobile).replace(/[\s-]/g, '')
        )
    ) {
        return 'Valid mobile is required.';
    }

    return null;
}


module.exports = {
    clean,
    validateRegistration,
    validateProfileUpdate
};