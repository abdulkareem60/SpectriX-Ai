// Left-hand panel of the sign-in page. Design ported from Musaykah's AuthShowcase
// (feature/incident-review-ui). The sample camera counts, uptime figure and "LIVE" feed were
// replaced with a labelled illustration of what the product does.
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import CameraIllustration from "@/components/landing/CameraIllustration";

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
          SpectriX <span className="text-teal-400">Ai</span>
        </span>
      </Link>

      <div className="relative max-w-lg">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-1.5 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          <span className="h-2 w-2 rounded-full bg-teal-400" />
          Operator console
        </span>

        <h2 className="text-5xl font-bold leading-[1.1] tracking-tight">
          Every restricted-zone entry, <span className="text-teal-400">in one place.</span>
        </h2>

        <p className="mt-5 text-lg leading-relaxed text-slate-600 dark:text-slate-400">
          Review the incidents raised by the vision worker, newest first.
        </p>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-xl backdrop-blur dark:border-white/10 dark:bg-white/5">
          <CameraIllustration name="Loading bay" kind="warehouse" person className="aspect-video" />
        </div>
      </div>

      <p className="relative text-sm text-slate-500">© 2026 SpectriX Ai</p>
    </section>
  );
}
