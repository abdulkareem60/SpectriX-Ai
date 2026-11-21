"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@/components/AuthProvider";
import { AUTH_EMULATOR_HOST } from "@/lib/config";

function signInMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-email"].includes(err.code)) {
      return "Email or password is incorrect.";
    }
    if (err.code === "auth/network-request-failed") {
      return AUTH_EMULATOR_HOST
        ? `Cannot reach the Auth emulator at ${AUTH_EMULATOR_HOST}. Is it running?`
        : "Cannot reach Firebase Auth. Check your connection.";
    }
    if (err.code === "auth/too-many-requests") return "Too many attempts. Wait a moment and try again.";
    return `Sign-in failed (${err.code}).`;
  }
  return "Sign-in failed.";
}

export default function LoginPage() {
  const { state, signIn, signOut } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      router.push("/");
    } catch (err) {
      setError(signInMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const input =
    "w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100";

  return (
    <div className="p-6 flex justify-center">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 space-y-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Operator sign-in</h1>
          {AUTH_EMULATOR_HOST && (
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              Local Auth emulator ({AUTH_EMULATOR_HOST}). Create a test account with backend/scripts/dev_operator_token.py.
            </p>
          )}
        </div>

        {state.status === "config-error" ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            Missing configuration: {state.missing.join(", ")}.
          </p>
        ) : state.status === "signed-in" ? (
          <div className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
            <p>
              Signed in as <strong>{state.email}</strong> (role: {state.role ?? "none"}).
            </p>
            <button type="button" onClick={() => void signOut()} className="text-xs font-semibold underline">
              Sign out
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Email
              <input className={`${input} mt-1`} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Password
              <input
                className={`${input} mt-1`}
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy || state.status === "loading"}
              className="w-full rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 px-3 py-2 text-sm font-semibold text-white"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
