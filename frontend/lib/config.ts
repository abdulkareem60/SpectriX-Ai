// Public browser configuration. NEXT_PUBLIC_* values are inlined at build time, so restart
// `npm run dev` (or rebuild) after changing .env.local. Never put secrets here: everything in
// this file ends up in the browser. The worker's X-Worker-Key must never be configured in the frontend.

/** Base URL of the FastAPI backend, without a trailing slash. Empty when not configured. */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim().replace(/\/+$/, "");

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
};

/** host:port of the Firebase Auth emulator, e.g. 127.0.0.1:9099. Empty in real deployments. */
export const AUTH_EMULATOR_HOST = (process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ?? "").trim();

/** Names of required settings that are missing, for a clear on-screen message. */
export function missingConfig(): string[] {
  const missing: string[] = [];
  if (!API_BASE_URL) missing.push("NEXT_PUBLIC_API_BASE_URL");
  if (!firebaseConfig.apiKey) missing.push("NEXT_PUBLIC_FIREBASE_API_KEY");
  if (!firebaseConfig.projectId) missing.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  return missing;
}
