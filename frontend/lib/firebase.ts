import { getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { AUTH_EMULATOR_HOST, firebaseConfig } from "./config";

let auth: Auth | null = null;

/** Firebase Auth for the browser. Connects to the Auth emulator when NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST is set. */
export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  auth = getAuth(app);
  if (AUTH_EMULATOR_HOST) {
    connectAuthEmulator(auth, `http://${AUTH_EMULATOR_HOST}`, { disableWarnings: true });
  }
  return auth;
}
