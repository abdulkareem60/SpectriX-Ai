import Link from "next/link";
import { ShieldCheck, Video, Activity, Bell } from "lucide-react";

export default function AuthShowcase() {
  return (
    <section className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
      <div
        className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(45,212,191,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(45,212,191,.12) 1px,transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      <Link href="/" className="relative flex items-center gap-2.5 text-xl font-bold">
        <ShieldCheck className="h-6 w-6 text-teal-400" />
        <span>
          Spectrix<span className="text-teal-400">AI</span>
        </span>
      </Link>

      <div className="relative max-w-lg">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-1.5 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          <span className="h-2 w-2 rounded-full bg-teal-400" />
          AI security and surveillance platform
        </span>

        <h2 className="text-5xl font-bold leading-[1.1] tracking-tight">
          Security that <span className="text-teal-400">never sleeps.</span>
        </h2>

        <p className="mt-5 text-lg leading-relaxed text-slate-600 dark:text-slate-400">
          Real-time monitoring, AI-powered detection and complete visibility over everything that matters.
        </p>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-xl backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Video className="h-4 w-4 text-teal-400" /> Live Feed · Main Gate
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-500">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              LIVE
            </span>
          </div>

          <div className="relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-slate-200 to-slate-100 dark:from-[#0f1c2e] dark:to-[#0a1424]">
            <div className="absolute left-[18%] top-[28%] h-[42%] w-[22%] rounded-md border-2 border-teal-400">
              <span className="absolute -top-5 left-0 rounded bg-teal-400 px-1.5 py-0.5 text-[10px] font-semibold text-slate-900">
                Person 98%
              </span>
            </div>
            <div className="absolute right-[16%] top-[40%] h-[34%] w-[26%] rounded-md border-2 border-amber-400">
              <span className="absolute -top-5 left-0 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-semibold text-slate-900">
                Vehicle 94%
              </span>
            </div>
            <div className="absolute inset-x-0 top-0 h-1/3 animate-pulse bg-gradient-to-b from-teal-400/20 to-transparent" />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[
              { icon: Video, label: "Cameras", value: "128" },
              { icon: Activity, label: "Uptime", value: "99.9%" },
              { icon: Bell, label: "Alerts today", value: "12" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-lg bg-slate-100 py-3 dark:bg-white/5">
                <Icon className="mx-auto mb-1 h-4 w-4 text-teal-400" />
                <div className="text-lg font-bold">{value}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

            <p className="relative text-sm text-slate-500">
        © 2026 SpectrixAI. All rights reserved.
      </p>
    </section>
  );
}