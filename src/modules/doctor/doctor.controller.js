const service = require('./doctor.service');

function register(req, res) {
	const result = service.register(req.body || {});
	if (result.error) return res.status(result.error[0]).json({ success: false, message: result.error[1] });
	return res.status(201).json({ success: true, message: 'Doctor registration submitted for admin review.', data: result.data });
}

function login(req, res) {
	const result = service.login(req.body?.email, req.body?.password);
	if (result.error) return res.status(result.error[0]).json({ success: false, message: result.error[1] });
	return res.json({ success: true, data: result.data, access_token: result.data.accessToken });
}

function profile(req, res) {
	const data = service.getProfile(req.user.id);
	if (!data) return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
	return res.json({ success: true, data });
}

function status(req, res) {
	const data = service.getStatus(req.user.id);
	if (!data) return res.status(404).json({ success: false, message: 'Doctor status not found.' });
	return res.json({ success: true, data });
}

function updateProfile(req, res) {
	const result = service.updateProfile(req.user.id, req.body || {});
	if (result.error) return res.status(result.error[0]).json({ success: false, message: result.error[1] });
	return res.json({ success: true, data: result.data });
}

module.exports = { register, login, profile, status, updateProfile };