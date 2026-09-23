const homeService = require('./home.service');

async function getHome(req, res) {
    try {
        const data = await homeService.getHomeData(req.user);
        return res.json({ success: true, message: 'Home data fetched successfully', data });
    } catch (error) {
        const statusCode = error.message === 'Patient access is required.' ? 403 : 500;
        return res.status(statusCode).json({ success: false, message: error.message || 'Unable to fetch home data.' });
    }
}

module.exports = { getHome };
