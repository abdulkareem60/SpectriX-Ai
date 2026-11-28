# SpectriX Ai frontend

The single Next.js app for SpectriX Ai: a public landing page, operator sign-in, and the signed-in console. It signs in with Firebase Auth and calls the FastAPI backend with the user's Firebase ID token (`Authorization: Bearer …`).

The browser never holds worker credentials. The worker's `X-Worker-Key` stays in `worker/.env` and `backend/.env` only.

## Routes

| Route | Who | What |
|---|---|---|
| `/` | Anyone | Landing page. Shows "Operator sign in", or "Open dashboard" when signed in |
| `/login` | Anyone | Operator sign-in with Firebase Auth. There is no sign-up: an administrator creates accounts and sets their `role` claim |
| `/dashboard` | Operators | Monitoring dashboard: API status, new-incident count, recent incidents |
| `/incidents` | Operators | Incident list with status filter and paging |
| `/settings` | Operators | Placeholder |

The console pages live in the `app/(console)/` route group, which adds the sidebar and header. Logout signs out of Firebase and returns to `/login`.

**Where the parts came from:**
- Dashboard shell, sidebar, header, camera tiles and theme toggle: Minal (`feature/monitoring-ui`).
- Landing page sections, camera illustration and sign-in page design: Musaykah (`feature/incident-review-ui`, originally in `spectrix-ai/`). Ported into `app/page.tsx`, `app/login/page.tsx`, `components/landing/` and `components/AuthShowcase.tsx`. Removed in the port: the simulated sign-in and sign-up, simulated live feeds and analytics, uptime and camera-count figures, fictional testimonials, the compliance badge, and links to pages that don't exist.

## What is connected

| Screen | Data |
|---|---|
| Landing page and sign-in illustration | **Static.** Labelled "Illustration"; planned features are marked "Planned" |
| Header: API status | Real: `GET /health`, every 15 s. Shows API connectivity only, not camera status |
| Dashboard: New incidents | Real: `GET /v1/incidents?status=new&limit=100` ("100+" when there are more) |
| Dashboard: Recent Activity | Real: latest 6 incidents, refreshed every 15 s |
| Incidents page | Real: `GET /v1/incidents`, status filter, "Load more" with `next_cursor` |
| Dashboard: Camera preview | Real: `GET /v1/cameras/{NEXT_PUBLIC_PREVIEW_CAMERA_ID}/preview` about every second. Shows the latest frame the worker analysed, with zones and boxes. States: **Waiting** (no frame yet), **Updating**, **Stale** (no new frame for over 10 s, by the API's clock; image dimmed), **Unavailable** (request failed; image dimmed). Paused while the tab is hidden |
| Other camera tiles, cameras online, zone count | **Sample / not available.** The API has no camera list, camera-status or zone-listing endpoint yet, so these are labelled and never shown as live |

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
| `NEXT_PUBLIC_PREVIEW_CAMERA_ID` | `cam-laptop` | Camera shown in the "Camera preview" tile; must equal the worker's `[camera] id`. Only the ID goes here, never a camera URL. Empty = sample tiles only |

These values are built into the page, so restart `npm run dev` after changing them.

### Local emulator sign-in

When `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` is set **and** the page is opened from `localhost`, `127.0.0.1` or `[::1]`:
- sign-in goes to the Auth emulator instead of real Firebase;
- the sign-in page shows a small **Local emulator** tag.

On any other host the emulator setting is never used. If it is set there, the app shows a configuration error instead of a sign-in form.

The check runs in the browser because `next build` also reads `.env.local`. A production build made on a developer machine could otherwise carry the emulator setting into a deployment.

**Test accounts:**
- `backend/scripts/dev_operator_token.py` creates an account in the emulator and sets its `role` claim.
- The password for every account it creates is the `PASSWORD` constant in that script.
- Roles allowed into the console: `operator`, `supervisor`, `admin` (the backend's `OPERATOR_ROLES`). Any other role, such as `viewer`, can sign in but is refused incident data (403).

Emulator accounts are lost when the emulator stops. Run the script again after each restart.

### Real Firebase (deployment)

1. Set `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` and `NEXT_PUBLIC_FIREBASE_PROJECT_ID` from the Firebase console (Project settings → Your apps → Web app).
2. Leave `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` **empty**.
3. Build where no `.env.local` is present, or set these variables in the build environment.
4. An administrator creates each account and sets its `role` custom claim with the Firebase Admin SDK. There is no self-service sign-up.

## Run against the local backend

1. From the repository root, start the emulators:
   ```powershell
   npx firebase-tools@15 emulators:start --only firestore,auth --project demo-nigahsense
   ```
2. From `backend/`, start the API:
   ```powershell
   .venv\Scripts\python -m uvicorn app.main:app --port 8000
   ```
3. From `backend/`, create test accounts in the Auth emulator (see [Local emulator sign-in](#local-emulator-sign-in)). The script also prints a token you don't need:
   ```powershell
   .venv\Scripts\python scripts\dev_operator_token.py --email operator@nigahsense.test --role operator
   .venv\Scripts\python scripts\dev_operator_token.py --email viewer@nigahsense.test --role viewer
   ```
4. Optional, for a test incident: from `backend/`, send a sample event with your local worker key:
   ```powershell
   .venv\Scripts\python scripts\send_sample_event.py --key <WORKER_API_KEYS value>
   ```
5. From `frontend/`:
   ```powershell
   npm run dev
   ```
6. Open **http://localhost:3000** (not `127.0.0.1`: the backend's default `CORS_ORIGINS` allows only `http://localhost:3000`). Click **Operator sign in**, sign in, and you land on `/dashboard`.

## Checks

```powershell
npm run lint
npx tsc --noEmit
npm run build
```
