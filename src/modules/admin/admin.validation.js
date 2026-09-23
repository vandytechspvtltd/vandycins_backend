function validateReject(input = {}) {
    const reason = String(input.reason || '').trim();
    return reason.length > 500 ? 'Rejection reason must be 500 characters or fewer.' : null;
}

module.exports = { validateReject };