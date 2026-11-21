"use client";

import Link from "next/link";
import { User } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import BackendStatus from "./BackendStatus";
import { useAuth } from "./AuthProvider";

export default function TopHeader() {
  const { state } = useAuth();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 px-6 py-3 bg-white/95 dark:bg-[#0a0f1e]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      {/* Left: API connectivity only. Camera status is not known to the backend yet. */}
      <BackendStatus />

      <div className="flex items-center gap-3">
        <ThemeToggle />
        {state.status === "signed-in" ? (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700"
            data-testid="signed-in-user"
          >
            <User size={13} className="text-slate-600 dark:text-slate-300" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{state.email ?? "Signed in"}</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500">{state.role ?? "no role"}</span>
          </div>
        ) : state.status === "signed-out" ? (
          <Link
            href="/login"
            className="px-3 py-1.5 rounded-lg border border-cyan-500/40 text-xs font-semibold text-cyan-700 dark:text-cyan-400"
          >
            Sign in
          </Link>
        ) : null}
      </div>
    </header>
  );
}
