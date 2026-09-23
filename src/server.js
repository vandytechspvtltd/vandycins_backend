const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { RtcTokenBuilder, RtcRole } = require('agora-token');
const swaggerUi = require('swagger-ui-express');
const config = require('./config/env');
const swaggerDocument = require('./config/swagger');

const patientRoutes = require('./modules/patient/routes');
const doctorRoutes = require('./modules/doctor/doctor.routes');
const adminRoutes = require('./modules/admin/admin.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/api-docs.json', (req, res) => res.json(swaggerDocument));
app.use('/v1/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/v1/api-docs.json', (req, res) => res.json(swaggerDocument));
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

const apiInfo = (req, res) => res.json({
    success: true,
    message: 'Vandycins Backend API is running.',
    version: '2.0.0',
    docs: '/v1/api-docs',
    openapi: '/v1/api-docs.json'
});

app.get('/', apiInfo);
app.get('/v1', apiInfo);
app.get('/v1/', apiInfo);

const healthInfo = (req, res) => res.json({
    status: 'ok',
    service: 'Vandycins Backend API',
    version: '2.0.0',
    agoraAppIdConfigured: Boolean(config.agoraAppId),
    agoraCertificateConfigured: Boolean(config.agoraAppCertificate),
    tokenGeneratorAvailable: Boolean(RtcTokenBuilder && RtcRole),
    authenticationConfigured: Boolean(jwt && config.jwtAccessSecret && config.jwtRefreshSecret)
});

app.get('/health', healthInfo);
app.get('/v1/health', healthInfo);

app.use('/v1', patientRoutes);
app.use('/v1/doctor', doctorRoutes);
app.use('/v1/doctor-portal', doctorRoutes);
app.use('/v1/admin', adminRoutes);
app.use('/api/home', require('./modules/patient/home/home.routes'));

app.listen(config.port, '0.0.0.0', () => {
    console.log('====================================================');
    console.log(`Telehealth API & Agora RTC Server running on :${config.port}`);
    console.log(`Agora App ID configured: ${Boolean(config.agoraAppId)}`);
    console.log(`Agora Certificate configured: ${Boolean(config.agoraAppCertificate)}`);
    console.log(`Base URL: http://localhost:${config.port}/v1/`);
    console.log(`Health Check: http://localhost:${config.port}/health`);
    console.log(`Swagger docs available at: http://localhost:${config.port}/api-docs`);
    console.log(`Swagger docs v1 alias: http://localhost:${config.port}/v1/api-docs`);
    console.log(`OpenAPI JSON available at: http://localhost:${config.port}/api-docs.json`);
    console.log('====================================================');
});

module.exports = app;
