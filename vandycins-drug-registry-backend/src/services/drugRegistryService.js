const { getAccessToken, clearToken } = require('./abdmTokenService');

function createError(message, statusCode = 500, publicMessage = message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.publicMessage = publicMessage;
  return error;
}

function encodeIdentifier(identifier) {
  return encodeURIComponent(identifier);
}

async function requestRegistry(path, query, hasRetried = false) {
  if (!process.env.ABDM_DRUG_REGISTRY_BASE_URL) {
    throw createError('ABDM_DRUG_REGISTRY_BASE_URL is not configured.', 500, 'ABDM service configuration is incomplete.');
  }

  const url = new URL(path, `${process.env.ABDM_DRUG_REGISTRY_BASE_URL.replace(/\/$/, '')}/`);
  for (const [key, value] of Object.entries(query || {})) {
    url.searchParams.set(key, String(value));
  }

  const accessToken = await getAccessToken();
  let response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      signal: AbortSignal.timeout(15000)
    });
  } catch (error) {
    throw createError(`ABDM Drug Registry request failed: ${error.message}`, 503, 'ABDM Drug Registry is unavailable.');
  }

  if (response.status === 401 && !hasRetried) {
    clearToken();
    return requestRegistry(path, query, true);
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw createError(`ABDM Drug Registry returned invalid JSON: ${error.message}`, 502, 'ABDM Drug Registry returned an invalid response.');
  }

  if (!response.ok) {
    const statusCode = [400, 401, 403, 404, 429, 500, 502, 503, 504].includes(response.status)
      ? response.status
      : 502;
    throw createError(`ABDM Drug Registry returned status ${response.status}`, statusCode, `ABDM Drug Registry request failed (${statusCode}).`);
  }

  return payload;
}

async function searchDrugs({ q, page, limit }) {
  return requestRegistry('/search', { q, page, limit });
}

async function getBrand(brandIdentifier) {
  return requestRegistry(`/brand/${encodeIdentifier(brandIdentifier)}`);
}

async function getGeneric(genericIdentifier) {
  return requestRegistry(`/generics/${encodeIdentifier(genericIdentifier)}`);
}

async function getSupplier(supplierIdentifier, { page, limit }) {
  return requestRegistry(`/suppliers/${encodeIdentifier(supplierIdentifier)}`, { page, limit });
}

async function getSubstance(substanceIdentifier) {
  return requestRegistry(`/substances/${encodeIdentifier(substanceIdentifier)}`);
}

module.exports = {
  searchDrugs,
  getBrand,
  getGeneric,
  getSupplier,
  getSubstance
};
