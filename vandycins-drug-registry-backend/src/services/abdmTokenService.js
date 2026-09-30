const { getAbdmHeaders } = require('../utils/abdmHeaders');

let cachedToken = null;
let tokenExpiresAt = 0;
let tokenRequest = null;

function createError(message, statusCode = 500, publicMessage = message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.publicMessage = publicMessage;
  return error;
}

function clearToken() {
  cachedToken = null;
  tokenExpiresAt = 0;
}

function getRequiredConfiguration() {
  const missing = ['ABDM_CLIENT_ID', 'ABDM_CLIENT_SECRET', 'ABDM_SESSION_URL']
    .filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw createError(
      `Missing required ABDM configuration: ${missing.join(', ')}`,
      500,
      'ABDM service configuration is incomplete.'
    );
  }
}

async function requestNewToken() {
  getRequiredConfiguration();

  let response;
  try {
    response = await fetch(process.env.ABDM_SESSION_URL, {
      method: 'POST',
      headers: {
        ...getAbdmHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientId: process.env.ABDM_CLIENT_ID,
        clientSecret: process.env.ABDM_CLIENT_SECRET,
        grantType: 'client_credentials'
      }),
      signal: AbortSignal.timeout(15000)
    });
  } catch (error) {
    throw createError(`ABDM session request failed: ${error.message}`, 503, 'ABDM authentication service is unavailable.');
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw createError(`ABDM session returned invalid JSON: ${error.message}`, 502, 'ABDM authentication returned an invalid response.');
  }

  if (!response.ok || !payload.accessToken) {
    throw createError(`ABDM session request failed with status ${response.status}`, response.status >= 400 && response.status < 600 ? response.status : 502, 'ABDM authentication failed.');
  }

  const expiresIn = Number(payload.expiresIn);
  const lifetimeSeconds = Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 300;
  const safetySeconds = Math.max(0, Number(process.env.ABDM_TOKEN_SAFETY_SECONDS) || 60);

  cachedToken = payload.accessToken;
  tokenExpiresAt = Date.now() + Math.max(1, lifetimeSeconds - safetySeconds) * 1000;

  return cachedToken;
}

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  if (!tokenRequest) {
    tokenRequest = requestNewToken().finally(() => {
      tokenRequest = null;
    });
  }

  return tokenRequest;
}

module.exports = {
  clearToken,
  getAccessToken
};
