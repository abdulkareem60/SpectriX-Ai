"use client";

// Ported from Musaykah's landing page (feature/incident-review-ui). Sign-up removed: operator
// accounts are created by an administrator, and the API has no sign-up endpoint.
import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Shield, X } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/components/AuthProvider";

export const links = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#solutions", label: "Solutions" },
  { href: "#security", label: "Security" },
];

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 whitespace-nowrap font-semibold">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-navy text-teal">
        <Shield size={18} strokeWidth={1.75} />
      </span>
      <span>
        SpectriX <span className="text-brand">Ai</span>
      </span>
    </Link>
  );
}

/** "Open dashboard" when signed in, otherwise "Operator sign in". */
export function PrimaryAction({ className = "" }: { className?: string }) {
  const { state } = useAuth();
  const signedIn = state.status === "signed-in";
  return (
    <Link href={signedIn ? "/dashboard" : "/login"} className={className}>
      {signedIn ? "Open dashboard" : "Operator sign in"}
    </Link>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-4 z-50 px-4">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full border border-line bg-card/80 pl-5 pr-2 shadow-[var(--float)] backdrop-blur-xl">
        <Logo />

        <div className="hidden items-center lg:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="rounded-full px-4 py-2 text-sm text-fg2 transition-colors hover:bg-raised hover:text-fg">
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <PrimaryAction className="hidden whitespace-nowrap rounded-full bg-navy px-5 py-2.5 text-sm font-medium sm:inline-block text-white transition-opacity hover:opacity-90 dark:bg-teal dark:text-navy" />
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-fg lg:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mx-auto mt-2 max-w-6xl rounded-3xl border border-line bg-card p-3 shadow-[var(--float)] lg:hidden"
          >
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-2xl px-4 py-3 text-fg2 hover:bg-raised hover:text-fg">
                {l.label}
              </a>
            ))}
            <PrimaryAction className="block rounded-2xl px-4 py-3 font-medium text-brand hover:bg-raised sm:hidden" />
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
