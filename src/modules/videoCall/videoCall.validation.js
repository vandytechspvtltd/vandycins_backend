function isValidId(value) {
    return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 200 && !/[\u0000-\u001f/]/.test(value);
}

function isValidCallSessionId(value) {
    return typeof value === 'string' && /^call_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isValidDescription(value, expectedType) {
    return value && typeof value === 'object' && !Array.isArray(value)
        && value.type === expectedType
        && typeof value.sdp === 'string'
        && value.sdp.length > 0
        && value.sdp.length <= 100000;
}

function isValidIceCandidate(value) {
    return value === null || (value && typeof value === 'object' && !Array.isArray(value)
        && typeof value.candidate === 'string' && value.candidate.length <= 16000);
}

module.exports = { isValidId, isValidCallSessionId, isValidDescription, isValidIceCandidate };