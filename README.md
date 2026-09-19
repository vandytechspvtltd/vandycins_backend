# Vandycins Video & REST Backend (Node.js)

Production-ready Node.js & Express REST API server with Agora RTC token service for the Telehealth Android application.

## Prerequisites
- Node.js (v18 or higher)
- npm or yarn

## Setup Instructions

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env` or edit the existing one:
   ```bash
   PORT=8080
   AGORA_APP_ID=0e4c1acfe9524ee395e774265f013175
   # If your Agora project has an App Certificate enabled in Agora Console:
   AGORA_APP_CERTIFICATE=
   ```

4. **Start the Server**:
   ```bash
   npm start
   ```
   Or with live reloading during development:
   ```bash
   npm run dev
   ```

5. **Verify Server Health**:
   Open in your browser or curl:
   ```bash
   curl http://localhost:8080/health
   ```

---

## API Endpoints Overview

All endpoints are mapped to `/v1/`:

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/auth/send-otp` | Sends OTP for phone verification |
| `POST` | `/v1/auth/verify-otp` | Verifies OTP and issues JWT auth credentials |
| `POST` | `/v1/auth/refresh-token` | Renews JWT access token |
| `POST` | `/v1/auth/logout` | Revokes current session |
| `GET` | `/v1/queue/live` | Real-time queue status, token, wait time |
| `GET` | `/v1/doctors` | List of doctors with online status & ratings |
| `GET` | `/v1/doctors/:id` | Doctor profile by ID |
| `POST` | `/v1/consultations/:id/join` | Generates Agora RTC channel, UID, & Token |
| `POST` | `/v1/consultations/:id/renew-token` | Renews expired Agora RTC token |
| `POST` | `/v1/consultations/end` | Closes consultation session |
| `GET` | `/v1/prescriptions/latest` | Latest E-Prescription with medicine breakdown |
| `GET` | `/v1/prescriptions/:id` | Prescription by ID |
| `GET` | `/v1/pharmacy/medicines` | Catalog of medicines with search & filter |
| `POST` | `/v1/pharmacy/orders` | Places a new medicine prescription order |
| `GET` | `/v1/orders/:id/tracking` | Live delivery tracking with delivery rider |

---

## Deploying to Production

You can deploy this server to any cloud provider:
- **Google Cloud Run**: `gcloud run deploy telehealth-api --source . --port 8080`
- **Render / Railway / Heroku**: Connect repository and set start command to `npm start`
- **AWS / DigitalOcean / VPS**: Run with PM2 (`pm2 start server.js --name telehealth-api`)
