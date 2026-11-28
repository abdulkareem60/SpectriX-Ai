import { getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { authEmulatorHost, firebaseConfig } from "./config";

let auth: Auth | null = null;

/**
 * Firebase Auth for the browser. Uses the Auth emulator only when one is configured AND the page
 * is served from localhost (see authEmulatorHost); otherwise real Firebase.
 */
export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  auth = getAuth(app);
  const emulator = authEmulatorHost();
  if (emulator) {
    connectAuthEmulator(auth, `http://${emulator}`, { disableWarnings: true });
  }
  return auth;
}
