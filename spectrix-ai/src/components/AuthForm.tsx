"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import AuthShowcase from "@/components/AuthShowcase";

type Mode = "login" | "signup";

const input =
  "w-full rounded-xl border border-slate-200 bg-white/70 py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-400/15 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500";

function getStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const isLogin = mode === "login";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const strength = useMemo(() => getStrength(password), [password]);
  const strengthLabel = ["Too weak", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = [
    "bg-slate-300 dark:bg-white/10",
    "bg-red-500",
    "bg-amber-500",
    "bg-teal-400",
    "bg-emerald-500",
  ][strength];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (!isLogin) {
      if (name.trim().length < 2) return setError("Please enter your full name.");
      if (password !== confirm) return setError("Passwords do not match.");
      if (!agree) return setError("You must accept the Terms and Privacy Policy.");
    }

    setLoading(true);
    try {
      // TODO: replace with your real API call
      await new Promise((r) => setTimeout(r, 1200));
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
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
                Spectrix<span className="text-teal-400">AI</span>
              </span>
            </Link>
            <ThemeToggle />
          </div>

          <div className="flex flex-1 items-center justify-center py-8">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-2xl shadow-slate-200/60 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f1a2b]/80 dark:shadow-black/40 sm:p-10">
              <h1 className="text-3xl font-bold tracking-tight">
                {isLogin ? "Welcome back" : "Create your account"}
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {isLogin
                  ? "Sign in to access your monitoring dashboard."
                  : "Start monitoring smarter in under a minute."}
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
                {!isLogin && (
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Full name"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={input}
                    />
                  </div>
                )}

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    placeholder="Email address"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={input}
                  />
                </div>

                <div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPw ? "text" : "password"}
                      placeholder="Password"
                      autoComplete={isLogin ? "current-password" : "new-password"}
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

                  {!isLogin && password && (
                    <div className="mt-2.5">
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4].map((i) => (
                          <span
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${
                              i <= strength ? strengthColor : "bg-slate-200 dark:bg-white/10"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                        Strength: <span className="font-medium">{strengthLabel}</span>
                      </p>
                    </div>
                  )}
                </div>

                {!isLogin && (
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPw ? "text" : "password"}
                      placeholder="Confirm password"
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className={input}
                    />
                  </div>
                )}

                {isLogin ? (
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex cursor-pointer items-center gap-2 text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 accent-teal-500"
                      />
                      Remember me
                    </label>
                    <Link
                      href="/forgot-password"
                      className="font-medium text-teal-500 hover:text-teal-400"
                    >
                      Forgot password?
                    </Link>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={agree}
                      onChange={(e) => setAgree(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-teal-500"
                    />
                    <span>
                      I agree to the{" "}
                      <Link href="/terms" className="font-medium text-teal-500 hover:text-teal-400">
                        Terms
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="font-medium text-teal-500 hover:text-teal-400">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                )}

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-teal-400 py-3.5 text-sm font-semibold text-slate-900 shadow-lg shadow-teal-400/25 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {isLogin ? "Sign in" : "Create account"}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-7 text-center text-sm text-slate-500 dark:text-slate-400">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <Link
                  href={isLogin ? "/signup" : "/login"}
                  className="font-semibold text-teal-500 hover:text-teal-400"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </Link>
              </p>

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                <Check className="h-3.5 w-3.5 text-teal-400" />
                256-bit encrypted · SOC 2 compliant
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}