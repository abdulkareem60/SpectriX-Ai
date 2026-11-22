// Public browser configuration. NEXT_PUBLIC_* values are inlined at build time, so restart
// `npm run dev` (or rebuild) after changing .env.local. Never put secrets here: everything in
// this file ends up in the browser. The worker's X-Worker-Key must never be configured in the frontend.

/** Base URL of the FastAPI backend, without a trailing slash. Empty when not configured. */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim().replace(/\/+$/, "");

/**
 * Camera ID whose "Camera preview" the dashboard shows (must match the worker's [camera] id), or "" for sample
 * tiles only. This is only an identifier: camera stream URLs and passwords stay with the worker.
 */
const rawPreviewCamera = (process.env.NEXT_PUBLIC_PREVIEW_CAMERA_ID ?? "").trim();
export const PREVIEW_CAMERA_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/.test(rawPreviewCamera) ? rawPreviewCamera : "";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
};

/**
 * host:port of the Firebase Auth emulator, e.g. 127.0.0.1:9099, as configured at build time.
 * Must be empty in real deployments. Use authEmulatorHost() rather than reading this directly.
 */
const CONFIGURED_AUTH_EMULATOR_HOST = (process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ?? "").trim();

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function servedFromThisMachine(): boolean {
  return typeof window !== "undefined" && LOCAL_HOSTNAMES.has(window.location.hostname);
}

/**
 * The Auth emulator to use, or "" for real Firebase. Browser only.
 * `next build` also reads .env.local, so a production build can accidentally carry the emulator
 * setting. It is therefore honoured only when the page itself is opened from localhost.
 */
export function authEmulatorHost(): string {
  return CONFIGURED_AUTH_EMULATOR_HOST && servedFromThisMachine() ? CONFIGURED_AUTH_EMULATOR_HOST : "";
}

/** Configuration problems to show instead of a sign-in form. Browser only; empty when all is well. */
export function configProblems(): string[] {
  const problems: string[] = [];
  if (!API_BASE_URL) problems.push("NEXT_PUBLIC_API_BASE_URL is not set.");
  if (!firebaseConfig.apiKey) problems.push("NEXT_PUBLIC_FIREBASE_API_KEY is not set.");
  if (!firebaseConfig.projectId) problems.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set.");
  if (CONFIGURED_AUTH_EMULATOR_HOST && !servedFromThisMachine()) {
    problems.push(
      "This build is set to use the local Auth emulator but is not running on localhost. " +
        "Leave NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST empty and rebuild.",
    );
  }
  return problems;
}
