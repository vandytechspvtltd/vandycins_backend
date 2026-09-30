require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const drugRegistryRoutes = require('./src/routes/drugRegistryRoutes');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
const port = Number(process.env.PORT) || 5000;
const environment = (process.env.ABDM_ENV || 'SBX').toUpperCase();
const configuredOrigins = (process.env.CORS_ORIGINS || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(cors({
  origin: configuredOrigins.includes('*') ? '*' : configuredOrigins
}));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'vandycins-drug-registry-backend',
    environment,
    timestamp: new Date().toISOString()
  });
});

app.use('/api/drug-registry', drugRegistryRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found.'
  });
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Vandycins Drug Registry backend listening on port ${port}`);
});
