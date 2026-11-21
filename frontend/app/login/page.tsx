"use client";

// Operator sign-in. Layout and form design ported from Musaykah's AuthForm
// (feature/incident-review-ui); the simulated sign-in is replaced by Firebase Auth.
// No sign-up: operator accounts and roles are created by an administrator.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import AuthShowcase from "@/components/AuthShowcase";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/components/AuthProvider";

const input =
  "w-full rounded-xl border border-slate-200 bg-white/70 py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-400/15 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500";

function signInMessage(err: unknown, emulatorHost: string): string {
  if (err instanceof FirebaseError) {
    if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-email"].includes(err.code)) {
      return "Email or password is incorrect.";
    }
    if (err.code === "auth/network-request-failed") {
      return emulatorHost
        ? `Cannot reach the local Auth emulator at ${emulatorHost}. Is it running?`
        : "Cannot reach the sign-in service. Check your connection.";
    }
    if (err.code === "auth/too-many-requests") return "Too many attempts. Wait a moment and try again.";
    if (err.code === "auth/user-disabled") return "This account has been disabled.";
    return `Sign-in failed (${err.code}).`;
  }
  return "Sign-in failed. Please try again.";
}

export default function LoginPage() {
  const { state, emulatorHost, signIn, signOut } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email address.");
    if (!password) return setError("Enter your password.");

    setBusy(true);
    try {
      await signIn(email.trim(), password);
      router.push("/dashboard");
    } catch (err) {
      setError(signInMessage(err, emulatorHost));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-[#0a111c] dark:text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-teal-400/10 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-[1400px] lg:grid-cols-2">
        <AuthShowcase />

        <section className="flex flex-col px-5 py-6 sm:px-10">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold lg:invisible">
              <ShieldCheck className="h-5 w-5 text-teal-400" />
              <span>
                SpectriX <span className="text-teal-400">Ai</span>
              </span>
            </Link>
            <ThemeToggle />
          </div>

          <div className="flex flex-1 items-center justify-center py-8">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-2xl shadow-slate-200/60 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f1a2b]/80 dark:shadow-black/40 sm:p-10">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-3xl font-bold tracking-tight">Operator sign in</h1>
                {/* Only on localhost with the emulator configured; setup steps are in frontend/README.md. */}
                {emulatorHost && (
                  <span
                    data-testid="emulator-badge"
                    title="Signing in against the local Firebase Auth emulator"
                    className="mt-1.5 shrink-0 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300"
                  >
                    Local emulator
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Use the account your administrator created for you.
              </p>

              {state.status === "config-error" ? (
                <p role="alert" className="mt-8 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                  Sign-in is not available: {state.problems.join(" ")}
                </p>
              ) : state.status === "signed-in" ? (
                <div className="mt-8 space-y-4 text-sm" data-testid="login-signed-in">
                  <p>
                    Signed in as <strong>{state.email}</strong> (role: {state.role ?? "none"}).
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-2 rounded-xl bg-teal-400 px-4 py-2.5 font-semibold text-slate-900 hover:bg-teal-300"
                    >
                      Open dashboard <ArrowRight className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => void signOut()}
                      className="rounded-xl border border-slate-300 px-4 py-2.5 font-semibold dark:border-white/15"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      placeholder="Email address"
                      aria-label="Email address"
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={input}
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPw ? "text" : "password"}
                      placeholder="Password"
                      aria-label="Password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${input} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-teal-400"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {error && (
                    <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={busy || state.status === "loading"}
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-teal-400 py-3.5 text-sm font-semibold text-slate-900 shadow-lg shadow-teal-400/25 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-label="Signing in" />
                    ) : (
                      <>
                        Sign in
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </form>
              )}

              <p className="mt-7 text-center text-sm text-slate-500 dark:text-slate-400">
                No account? Ask your SpectriX Ai administrator.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
