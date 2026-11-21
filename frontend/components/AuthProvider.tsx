"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  getIdTokenResult,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { missingConfig } from "@/lib/config";
import { getFirebaseAuth } from "@/lib/firebase";

export type AuthState =
  | { status: "loading" }
  | { status: "config-error"; missing: string[] }
  | { status: "signed-out" }
  | { status: "signed-in"; user: User; email: string | null; role: string | null };

interface AuthContextValue {
  state: AuthState;
  /** A fresh Firebase ID token for the API. Throws if nobody is signed in. */
  getToken: () => Promise<string>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    const missing = missingConfig();
    if (missing.length) {
      // Configuration is fixed at build time; report it once instead of initialising Firebase.
      queueMicrotask(() => setState({ status: "config-error", missing }));
      return;
    }
    return onIdTokenChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        setState({ status: "signed-out" });
        return;
      }
      // The role claim is shown for information only; the API makes the access decision.
      const role = await getIdTokenResult(user)
        .then((r) => (typeof r.claims.role === "string" ? r.claims.role : null))
        .catch(() => null);
      setState({ status: "signed-in", user, email: user.email, role });
    });
  }, []);

  const getToken = useCallback(async () => {
    const user = getFirebaseAuth().currentUser;
    if (!user) throw new Error("Not signed in.");
    return user.getIdToken();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(getFirebaseAuth());
  }, []);

  const value = useMemo(() => ({ state, getToken, signIn, signOut }), [state, getToken, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}
