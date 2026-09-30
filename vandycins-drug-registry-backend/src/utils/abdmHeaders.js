const crypto = require('node:crypto');

function getAbdmHeaders() {
  const environment = (process.env.ABDM_ENV || 'SBX').toUpperCase();

  return {
    Accept: 'application/json',
    'REQUEST-ID': crypto.randomUUID(),
    TIMESTAMP: new Date().toISOString(),
    'X-CM-ID': environment === 'PROD' ? 'ABDM' : 'SBX'
  };
}

module.exports = { getAbdmHeaders };
