"use client";

// Public landing page. Design and sections ported from Musaykah's landing page
// (feature/incident-review-ui, spectrix-ai/src/app/page.tsx). Content is limited to what the
// product does today, with planned features marked as planned. Removed from the original:
// simulated live feeds and motion alerts, sample analytics and uptime/camera counts,
// fictional testimonials, sign-up, placeholder contact and social links.
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BellRing,
  Building2,
  Camera,
  ClipboardList,
  Factory,
  FileVideo,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  PenTool,
  ServerOff,
  ShieldAlert,
  ShieldCheck,
  Warehouse,
} from "lucide-react";
import Navbar, { Logo, PrimaryAction } from "@/components/landing/Navbar";
import { Reveal, SectionHead } from "@/components/landing/Reveal";
import CameraIllustration from "@/components/landing/CameraIllustration";

/* 1. HERO -------------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden pb-24 pt-32 sm:pt-40">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(39,198,181,0.18),transparent)]" />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1.5 text-sm text-fg2">
            <span className="h-2 w-2 rounded-full bg-teal" />
            AI-assisted surveillance and safety monitoring
          </span>
          <h1 className="mt-6 text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            Know when someone enters a <span className="text-brand">restricted zone.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-fg2">
            SpectriX Ai watches your camera or recorded video, detects people, and raises an incident when
            someone walks into an area you have marked as off-limits. Operators review every incident in
            one dashboard.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <PrimaryAction className="inline-flex h-12 items-center gap-2 rounded-full bg-navy px-6 font-medium text-white transition-opacity hover:opacity-90 dark:bg-teal dark:text-navy" />
            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-line bg-card px-6 font-medium transition-colors hover:bg-raised"
            >
              How it works <ArrowRight size={16} />
            </a>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto mt-16 max-w-6xl px-4 sm:px-6"
      >
        <div className="rounded-[2rem] border border-line bg-card p-3 shadow-[var(--float)] sm:p-4">
          <div className="flex items-center justify-between px-2 pb-3 pt-1 text-sm">
            <span className="font-medium">SpectriX Ai console</span>
            <span className="text-fg3">Illustration, not live footage</span>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <CameraIllustration name="Loading bay" kind="warehouse" person className="aspect-video lg:col-span-2" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <CameraIllustration name="Main entrance" kind="entrance" className="aspect-video" />
              <CameraIllustration name="Parking" kind="parking" className="aspect-video" />
            </div>
          </div>
        </div>

        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
          className="absolute -bottom-6 left-10 hidden items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 shadow-[var(--float)] md:flex"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/20 text-amber-500">
            <BellRing size={18} />
          </span>
          <div>
            <p className="text-sm font-medium">Restricted zone entry</p>
            <p className="text-xs text-fg3">Example incident</p>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* 2. FEATURES ---------------------------------------------------------------------------- */

const featureList = [
  {
    icon: ShieldAlert,
    title: "Restricted-zone alerts",
    text: "A person whose feet enter a zone you drew raises one incident per visit, not one per frame.",
    planned: false,
  },
  {
    icon: ClipboardList,
    title: "Incident review",
    text: "Operators see new and acknowledged incidents, newest first, with times in Pakistan Standard Time.",
    planned: false,
  },
  {
    icon: FileVideo,
    title: "Recorded video, webcams and IP cameras",
    text: "Analyse a recorded file, a local webcam or an RTSP camera stream with the same detection rules.",
    planned: false,
  },
  {
    icon: KeyRound,
    title: "Role-based sign-in",
    text: "Operators, supervisors and admins sign in with their own accounts. Only supervisors and admins change zones.",
    planned: false,
  },
  {
    icon: PenTool,
    title: "Visual zone editor",
    text: "Draw restricted zones on a still frame from the camera and save them for the worker to use.",
    planned: true,
  },
  {
    icon: Camera,
    title: "Live camera view and evidence",
    text: "Watch cameras in the dashboard and open a snapshot or clip for each incident.",
    planned: true,
  },
];

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
      <SectionHead
        eyebrow="What it does"
        title="Built around one job, done carefully"
        text="Features marked Planned are on the roadmap and not available yet."
      />
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {featureList.map((f, i) => (
          <Reveal key={f.title} delay={(i % 3) * 0.08} className="h-full">
            <div className="group h-full rounded-3xl border border-line bg-card p-7 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[var(--float)]">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal/15 text-brand transition-colors group-hover:bg-teal group-hover:text-navy">
                  <f.icon size={22} strokeWidth={1.75} />
                </div>
                {f.planned && (
                  <span className="rounded-full border border-line px-2.5 py-1 text-xs text-fg3">Planned</span>
                )}
              </div>
              <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 leading-7 text-fg2">{f.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* 3. HOW IT WORKS ------------------------------------------------------------------------ */

const steps = [
  { icon: Camera, title: "Connect a video source", text: "A recorded video, a webcam or an RTSP camera." },
  { icon: PenTool, title: "Mark restricted zones", text: "Outline the areas people must not enter." },
  { icon: ShieldAlert, title: "Detect zone entries", text: "The vision worker tracks people and reports each confirmed entry." },
  { icon: LayoutDashboard, title: "Review incidents", text: "Operators see and handle every incident in the dashboard." },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 bg-raised py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHead eyebrow="How it works" title="From video to incident in four steps" />
        <div className="relative mt-16 grid gap-10 lg:grid-cols-4">
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-6 right-6 top-6 hidden h-px origin-left bg-line lg:block"
          />
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.1}>
              <div className="relative">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-line bg-bg text-brand">
                  <s.icon size={20} strokeWidth={1.75} />
                </div>
                <p className="mt-5 font-mono text-sm text-fg3">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 leading-7 text-fg2">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* 4. SOLUTIONS --------------------------------------------------------------------------- */

const solutionList = [
  { icon: Warehouse, title: "Warehouses", text: "Keep people out of loading bays, racking aisles and storage blocks.", hue: "rgba(96,165,250,0.3)" },
  { icon: Factory, title: "Industrial sites", text: "Watch machine areas and other zones that are unsafe to enter.", hue: "rgba(39,198,181,0.3)" },
  { icon: Building2, title: "Offices", text: "Flag entry to server rooms, roofs and other restricted rooms.", hue: "rgba(96,165,250,0.35)" },
  { icon: GraduationCap, title: "Campuses", text: "Cover closed-off grounds, construction areas and gates after hours.", hue: "rgba(125,211,252,0.3)" },
];

function Solutions() {
  return (
    <section id="solutions" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
      <SectionHead eyebrow="Where it helps" title="For any space with areas people must not enter" />
      <div className="mt-14 grid gap-5 sm:grid-cols-2">
        {solutionList.map((s, i) => (
          <Reveal key={s.title} delay={(i % 2) * 0.08}>
            <div className="group relative aspect-[16/9] overflow-hidden rounded-3xl bg-navy">
              <div
                className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
                style={{
                  backgroundImage: `radial-gradient(circle at 75% 25%, ${s.hue}, transparent 55%), linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
                  backgroundSize: "auto, 32px 32px, 32px 32px",
                }}
              />
              <span className="absolute left-5 top-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur">
                <s.icon size={22} strokeWidth={1.75} />
              </span>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 pt-16 text-white">
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-white/75">{s.text}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* 5. SECURITY (what the system actually does today) ------------------------------------- */

const securityList = [
  { icon: ShieldCheck, title: "Sign-in required", text: "Incident data is only served to signed-in accounts with an operator, supervisor or admin role." },
  { icon: KeyRound, title: "Roles checked on the server", text: "The API checks each request's role. Only supervisors and admins can change zones." },
  { icon: ServerOff, title: "No video in the database", text: "Only small incident records are stored, never video frames." },
  { icon: ClipboardList, title: "Zone history kept", text: "Every saved version of a zone is kept, with who saved it and when." },
];

function Security() {
  return (
    <section id="security" className="scroll-mt-24 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-7xl rounded-[2rem] bg-navy px-6 py-16 text-white sm:px-12">
        <SectionHead dark eyebrow="Security" title="How access is controlled" text="How the system works today. No certifications are claimed." />
        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          {securityList.map((t, i) => (
            <Reveal key={t.title} delay={(i % 2) * 0.08}>
              <div className="h-full rounded-3xl border border-white/10 bg-white/5 p-6">
                <t.icon size={22} strokeWidth={1.75} className="text-teal" />
                <h3 className="mt-4 font-semibold">{t.title}</h3>
                <p className="mt-1 text-sm text-white/70">{t.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* 6. FINAL CALL TO ACTION ---------------------------------------------------------------- */

function FinalCta() {
  return (
    <section className="px-4 pb-24 pt-12 sm:px-6">
      <Reveal>
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-navy px-6 py-20 text-center text-white sm:px-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_70%_at_50%_100%,rgba(39,198,181,0.35),transparent)]" />
          <div className="relative">
            <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">Ready to review incidents?</h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-white/70">
              Sign in with the operator account your administrator gave you.
            </p>
            <PrimaryAction className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-teal px-7 font-medium text-navy transition-opacity hover:opacity-90" />
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* 7. FOOTER ------------------------------------------------------------------------------ */

const footerLinks = [
  ["Features", "#features"],
  ["How it works", "#how-it-works"],
  ["Where it helps", "#solutions"],
  ["Security", "#security"],
];

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 md:flex-row md:items-start md:justify-between">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-fg2">AI-assisted surveillance and safety monitoring.</p>
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-fg2">
          {footerLinks.map(([label, href]) => (
            <li key={label}>
              <a href={href} className="hover:text-fg">
                {label}
              </a>
            </li>
          ))}
          <li>
            <Link href="/login" className="hover:text-fg">
              Operator sign in
            </Link>
          </li>
        </ul>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-6 py-6 text-sm text-fg3">© 2026 SpectriX Ai</p>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div id="top" className="min-h-screen bg-bg text-fg">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Solutions />
        <Security />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
