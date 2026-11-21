# SpectriX Ai frontend

Next.js dashboard for operators. It signs in with Firebase Auth and calls the FastAPI backend with the user's Firebase ID token (`Authorization: Bearer …`).

The browser never holds worker credentials. The worker's `X-Worker-Key` stays in `worker/.env` and `backend/.env` only.

## What is connected

| Screen | Data |
|---|---|
| Header: API status | Real: `GET /health`, every 15 s. Shows API connectivity only, not camera status |
| Dashboard: New incidents | Real: `GET /v1/incidents?status=new&limit=100` ("100+" when there are more) |
| Dashboard: Recent Activity | Real: latest 6 incidents, refreshed every 15 s |
| Incidents page | Real: `GET /v1/incidents`, status filter, "Load more" with `next_cursor` |
| Camera tiles, cameras online, zone count | **Sample / not available.** The API has no camera, camera-status or zone-listing endpoint yet, so these are labelled and never shown as live |

Each incident view has separate loading, empty, sign-in required, wrong-role (403), session-rejected (401) and API error states. A failed request never shows old data as current.

## Local setup

Prerequisites: Node.js 24, plus the backend set up as in the [root README](../README.md).

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
```

`.env.local` (Git-ignored) settings:

| Variable | Local value | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://127.0.0.1:8000` | Backend URL. Required |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | any non-empty value on the emulator | Firebase web API key (public, not a secret) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `demo-nigahsense.firebaseapp.com` | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `demo-nigahsense` | Must match the backend's `FIREBASE_PROJECT_ID` |
| `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` | `127.0.0.1:9099` | Auth emulator. Leave empty for real Firebase |

These values are built into the page, so restart `npm run dev` after changing them.

## Run against the local backend

1. From the repository root, start the emulators:
   ```powershell
   npx firebase-tools@15 emulators:start --only firestore,auth --project demo-nigahsense
   ```
2. From `backend/`, start the API:
   ```powershell
   .venv\Scripts\python -m uvicorn app.main:app --port 8000
   ```
3. From `backend/`, create an operator account in the Auth emulator. The script prints a token you don't need; the account's password is the `PASSWORD` constant in the script:
   ```powershell
   .venv\Scripts\python scripts\dev_operator_token.py --email operator@nigahsense.test --role operator
   ```
4. Optional, for a test incident: from `backend/`, send a sample event with your local worker key:
   ```powershell
   .venv\Scripts\python scripts\send_sample_event.py --key <WORKER_API_KEYS value>
   ```
5. From `frontend/`:
   ```powershell
   npm run dev
   ```
6. Open **http://localhost:3000** (not `127.0.0.1`: the backend's default `CORS_ORIGINS` allows only `http://localhost:3000`) and sign in.

## Checks

```powershell
npm run lint
npx tsc --noEmit
npm run build
```
