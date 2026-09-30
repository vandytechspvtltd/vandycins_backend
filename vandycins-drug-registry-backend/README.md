# Vandycins Drug Registry Backend

Standalone Node.js 20+ and Express backend for the ABDM Drug Registry. The backend owns ABDM authentication and proxies Drug Registry requests for Android clients. It does not use MongoDB or mock drug data.

## Project Setup

Requirements:

- Node.js 20 or newer
- Valid ABDM Sandbox Client ID and Client Secret for live Registry calls

From this directory:

```powershell
npm install
```

Copy `.env.example` to `.env` if needed, then configure the ABDM credentials. `.env` is ignored by Git.

## Environment Configuration

```env
PORT=5000
NODE_ENV=development
ABDM_ENV=SBX
ABDM_CLIENT_ID=
ABDM_CLIENT_SECRET=
ABDM_SESSION_URL=https://live.abdm.gov.in/api/hiecm/gateway/v3/sessions
ABDM_DRUG_REGISTRY_BASE_URL=https://drugregistrysbx.abdm.gov.in/drug-registry/v1
ABDM_TOKEN_SAFETY_SECONDS=60
CORS_ORIGINS=*
```

For production, set `ABDM_ENV=PROD`, use the approved production Registry base URL, restrict `CORS_ORIGINS` to trusted origins, and keep credentials only in server-side secret storage.

## Run

Development with automatic restart:

```powershell
npm run dev
```

Production-style start:

```powershell
npm start
```

The default address is `http://localhost:5000`.

## Health API

```http
GET /health
```

Example response:

```json
{
  "success": true,
  "service": "vandycins-drug-registry-backend",
  "environment": "SBX",
  "timestamp": "2026-09-30T00:00:00.000Z"
}
```

## Drug Registry APIs

All endpoints return `{ "success": true, "data": {} }` on success and `{ "success": false, "message": "..." }` on errors.

| Method | Endpoint | ABDM endpoint |
| --- | --- | --- |
| GET | `/api/drug-registry/search?q=Paracetamol&page=0&limit=10` | `/search` |
| GET | `/api/drug-registry/brand/{brandIdentifier}` | `/brand/{brandIdentifier}` |
| GET | `/api/drug-registry/generic/{genericIdentifier}` | `/generics/{genericIdentifier}` |
| GET | `/api/drug-registry/supplier/{supplierIdentifier}?page=0&limit=10` | `/suppliers/{supplierIdentifier}` |
| GET | `/api/drug-registry/substance/{substanceIdentifier}` | `/substances/{substanceIdentifier}` |

`q`, `page`, and `limit` are required for search. `page` and `limit` are required for supplier details. Identifiers are required for all detail endpoints.

## curl Examples

```powershell
curl http://localhost:5000/health
curl "http://localhost:5000/api/drug-registry/search?q=Paracetamol&page=0&limit=10"
curl "http://localhost:5000/api/drug-registry/brand/{brandIdentifier}"
curl "http://localhost:5000/api/drug-registry/generic/{genericIdentifier}"
curl "http://localhost:5000/api/drug-registry/supplier/{supplierIdentifier}?page=0&limit=10"
curl "http://localhost:5000/api/drug-registry/substance/{substanceIdentifier}"
```

## Postman Examples

Create a collection variable `baseUrl` with value `http://localhost:5000`, then create GET requests for:

- `{{baseUrl}}/health`
- `{{baseUrl}}/api/drug-registry/search?q=Paracetamol&page=0&limit=10`
- `{{baseUrl}}/api/drug-registry/brand/{brandIdentifier}`
- `{{baseUrl}}/api/drug-registry/generic/{genericIdentifier}`
- `{{baseUrl}}/api/drug-registry/supplier/{supplierIdentifier}?page=0&limit=10`
- `{{baseUrl}}/api/drug-registry/substance/{substanceIdentifier}`

No ABDM token needs to be added in Postman. The backend obtains and caches it server-side.

## ABDM Token Flow

1. The first Registry request calls the ABDM session URL with `clientId`, `clientSecret`, and `grantType=client_credentials`.
2. The request includes `Accept`, `Content-Type`, `REQUEST-ID`, `TIMESTAMP`, and environment-specific `X-CM-ID` headers.
3. The access token is kept in server memory until its safety-adjusted expiry.
4. Later requests reuse the cached token.
5. A Registry `401` clears the cache, obtains one new token, and retries once.
6. Secrets and tokens are never returned to Android or logged.

## Android Integration Flow

Android calls only the Vandycins backend URL, for example:

```text
https://YOUR-VANDYCINS-BACKEND/api/drug-registry/search?q=Paracetamol&page=0&limit=10
```

Android must never call the ABDM session API directly and must never contain the ABDM Client Secret.

## Sandbox and Production

Sandbox defaults are `ABDM_ENV=SBX`, `X-CM-ID: SBX`, the supplied ABDM session URL, and the supplied Sandbox Drug Registry URL. Production requires the production ABDM environment value and approved production Registry URL in server-side configuration.

## Security Notes

- Never commit `.env`.
- Never hard-code or expose Client ID, Client Secret, access token, or refresh token.
- Restrict production CORS origins.
- Use HTTPS in deployed environments.
- This process stores the current token only in server memory; restarting the process requests a new token.
- Live ABDM testing requires valid ABDM Sandbox credentials. No fake success responses are included.
