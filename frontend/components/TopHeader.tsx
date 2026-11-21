"use client";

import ThemeToggle from "./ThemeToggle";
import { User } from "lucide-react";

export default function TopHeader() {
  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between
                 px-6 py-3
                 bg-white/95 dark:bg-[#0a0f1e]/95
                 backdrop-blur-md
                 border-b border-slate-200 dark:border-slate-800"
    >
      {/* Left — pulsing LIVE MONITORING badge */}
      <div className="flex items-center gap-3">
        <span
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                     bg-green-500/10 border border-green-500/30
                     text-green-600 dark:text-green-400
                     text-xs font-bold tracking-widest uppercase"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
          </span>
          LIVE MONITORING
        </span>
      </div>

      {/* Right — ThemeToggle + Operator pill */}
      <div className="flex items-center gap-3">
        <ThemeToggle />

        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg
                     bg-slate-100 dark:bg-slate-800/80
                     border border-slate-200 dark:border-slate-700"
        >
          <div
            className="w-6 h-6 rounded-full
                       bg-slate-300 dark:bg-slate-700
                       border border-slate-400 dark:border-slate-600
                       flex items-center justify-center"
          >
            <User size={13} className="text-slate-600 dark:text-slate-300" />
          </div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Operator
          </span>
        </div>
      </div>
    </header>
  );
}
