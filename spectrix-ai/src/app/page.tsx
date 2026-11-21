"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BellRing,
  Building2,
  Cpu,
  EyeOff,
  Factory,
  Globe,
  GraduationCap,
  Home as HomeIcon,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  Lock,
  Mail,
  MapPin,
  Play,
  Plug,
  Server,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Star,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Navbar, { Logo } from "@/components/Navbar";
import IntroGate from "@/components/IntroGate";

/* =====================================================================
   SHARED HELPERS (Reveal animation + section heading)
   ===================================================================== */

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function SectionHead({
  eyebrow,
  title,
  text,
  dark = false,
}: {
  eyebrow: string;
  title: string;
  text?: string;
  dark?: boolean;
}) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <p className={`text-sm font-medium ${dark ? "text-teal" : "text-brand"}`}>
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {text && (
        <p className={`mt-4 text-lg ${dark ? "text-white/70" : "text-fg2"}`}>
          {text}
        </p>
      )}
    </Reveal>
  );
}

/* =====================================================================
   SIMULATED CAMERA FEED (code se bana, real stream nahi hai)
   ===================================================================== */

type Camera = {
  name: string;
  loc: string;
  kind: "entrance" | "parking" | "office" | "warehouse" | "reception" | "server";
  online: boolean;
};

const cameras: Camera[] = [
  { name: "Main Entrance", loc: "Ground floor, Gate A", kind: "entrance", online: true },
  { name: "Parking Area", loc: "Basement P1", kind: "parking", online: true },
  { name: "Office Floor", loc: "Floor 3, East wing", kind: "office", online: true },
  { name: "Warehouse", loc: "Block C", kind: "warehouse", online: true },
  { name: "Reception", loc: "Main lobby", kind: "reception", online: true },
  { name: "Server Room", loc: "Floor 2, Restricted", kind: "server", online: false },
];

function useClock() {
  const [now, setNow] = useState({ time: "--:--:--", date: "" });
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow({
        time: d.toLocaleTimeString("en-GB"),
        date: d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function Scene({ kind, person }: { kind: Camera["kind"]; person: boolean }) {
  const a = "#1d3149";
  const b = "#2b4562";
  return (
    <>
      <rect width="320" height="180" fill="#0f1b2d" />
      <rect y="140" width="320" height="40" fill="#0a1422" />
      {kind === "entrance" && (
        <>
          <rect x="96" y="36" width="128" height="104" fill={a} stroke={b} />
          <line x1="160" y1="36" x2="160" y2="140" stroke={b} />
        </>
      )}
      {kind === "parking" && (
        <>
          {[24, 124, 224].map((x) => (
            <g key={x}>
              <rect x={x} y="92" width="72" height="30" rx="9" fill={a} stroke={b} />
              <rect x={x + 12} y="80" width="48" height="16" rx="6" fill={a} stroke={b} />
            </g>
          ))}
          <line x1="0" y1="152" x2="320" y2="152" stroke={b} strokeDasharray="10 8" />
        </>
      )}
      {kind === "office" &&
        [20, 120, 220].map((x) => (
          <g key={x}>
            <rect x={x} y="100" width="80" height="8" fill={b} />
            <rect x={x + 14} y="74" width="52" height="26" rx="3" fill={a} stroke={b} />
          </g>
        ))}
      {kind === "warehouse" &&
        [16, 116, 216].map((x) => (
          <g key={x}>
            <rect x={x} y="28" width="88" height="112" fill="none" stroke={b} />
            {[56, 84, 112].map((y) => (
              <line key={y} x1={x} x2={x + 88} y1={y} y2={y} stroke={b} />
            ))}
            <rect x={x + 8} y="38" width="24" height="18" fill={a} />
            <rect x={x + 44} y="94" width="30" height="18" fill={a} />
          </g>
        ))}
      {kind === "reception" && (
        <>
          <rect x="60" y="96" width="140" height="44" rx="6" fill={a} stroke={b} />
          <rect x="230" y="70" width="30" height="70" rx="6" fill={a} stroke={b} />
        </>
      )}
      {kind === "server" &&
        [30, 100, 170, 240].map((x) => (
          <g key={x}>
            <rect x={x} y="30" width="52" height="110" fill={a} stroke={b} />
            {[44, 62, 80, 98, 116].map((y) => (
              <circle key={y} cx={x + 42} cy={y} r="2" fill="#27c6b5" />
            ))}
          </g>
        ))}
      {person && (
        <>
          <circle cx="248" cy="96" r="8" fill="#7f97b3" />
          <rect x="238" y="106" width="20" height="44" rx="8" fill="#7f97b3" />
        </>
      )}
    </>
  );
}

function CameraFeed({
  cam,
  time,
  motion = false,
  className = "",
}: {
  cam: Camera;
  time: string;
  motion?: boolean;
  className?: string;
}) {
  const off = !cam.online;
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-[#0c1624] ${className}`}>
      <svg
        viewBox="0 0 320 180"
        preserveAspectRatio="xMidYMid slice"
        className={`block h-full w-full ${off ? "opacity-20" : ""}`}
        aria-hidden="true"
      >
        <Scene kind={cam.kind} person={motion && !off} />
      </svg>

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0 1px, transparent 1px 3px)",
        }}
      />

      {motion && !off && (
        <div className="absolute left-[71%] top-[44%] h-[42%] w-[13%] rounded-sm border-2 border-amber-400">
          <span className="absolute -top-5 left-[-2px] whitespace-nowrap bg-amber-400 px-1.5 text-[11px] font-medium text-black">
            Motion
          </span>
        </div>
      )}

      {off && (
        <div className="absolute inset-0 flex items-center justify-center font-mono text-xs tracking-widest text-white/50">
          NO SIGNAL
        </div>
      )}

      <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[11px] text-white backdrop-blur">
        {cam.name}
      </span>
      <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[11px] text-white backdrop-blur">
        {off ? (
          <>
            <span className="h-2 w-2 rounded-full bg-slate-400" /> OFFLINE
          </>
        ) : (
          <>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/70" />
              <span className="relative h-2 w-2 rounded-full bg-red-500" />
            </span>
            LIVE
          </>
        )}
      </span>
      <span className="absolute bottom-3 left-3 font-mono text-[11px] text-white/80">
        {time}
      </span>
    </div>
  );
}

/* =====================================================================
   1. HERO
   ===================================================================== */

function Hero() {
  const { time } = useClock();

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
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal/70" />
              <span className="relative h-2 w-2 rounded-full bg-teal" />
            </span>
            AI security and surveillance platform
          </span>
          <h1 className="mt-6 text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            Security That Never <span className="text-brand">Sleeps.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-fg2">
            Experience intelligent surveillance with real-time monitoring,
            AI-powered detection, and complete visibility over everything that
            matters.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#platform"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-navy px-6 font-medium text-white transition-opacity hover:opacity-90 dark:bg-teal dark:text-navy"
            >
              Explore Platform <ArrowRight size={16} />
            </a>
            <a
              href="#platform"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-line bg-card px-6 font-medium transition-colors hover:bg-raised"
            >
              <Play size={16} /> Watch Live Demo
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
            <span className="font-medium">SpectrixAI Console</span>
            <span className="flex items-center gap-3 text-fg3">
              <span className="hidden sm:inline">Simulated demo data</span>
              <span className="font-mono tabular-nums">{time}</span>
              <span className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                LIVE
              </span>
            </span>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <CameraFeed
              cam={cameras[0]}
              time={time}
              motion
              className="aspect-video lg:col-span-2"
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <CameraFeed cam={cameras[1]} time={time} className="aspect-video" />
              <CameraFeed cam={cameras[4]} time={time} className="aspect-video" />
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-raised p-4">
              <p className="text-xs text-fg3">Camera status</p>
              <p className="mt-1 font-medium">5 of 6 online</p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-raised p-4">
              <MapPin size={20} className="text-brand" />
              <div>
                <p className="text-xs text-fg3">Site</p>
                <p className="font-medium">HQ Building, Floors 1 to 3</p>
              </div>
            </div>
            <div className="rounded-2xl bg-raised p-4">
              <p className="text-xs text-fg3">AI detection</p>
              <p className="mt-1 font-medium">Motion at Main Entrance</p>
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
            <p className="text-sm font-medium">Motion detected</p>
            <p className="text-xs text-fg3">Main Entrance, just now</p>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* =====================================================================
   2. LIVE MONITORING (dark section)
   ===================================================================== */

function LiveMonitor() {
  const { time, date } = useClock();
  const [active, setActive] = useState(0);
  const [motion, setMotion] = useState<number | null>(null);
  const [events, setEvents] = useState<{ t: string; text: string }[]>([]);

  // Simulated motion alerts, har 4 second mein ek camera par
  useEffect(() => {
    const online = cameras
      .map((c, i) => (c.online ? i : -1))
      .filter((i) => i >= 0);
    let n = 0;
    const id = setInterval(() => {
      const i = online[n % online.length];
      n++;
      setMotion(i);
      setEvents((e) =>
        [
          {
            t: new Date().toLocaleTimeString("en-GB"),
            text: `Motion detected, ${cameras[i].name}`,
          },
          ...e,
        ].slice(0, 4)
      );
      setTimeout(() => setMotion(null), 2500);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const cam = cameras[active];
  const onlineCount = cameras.filter((c) => c.online).length;

  const liveStats = [
    { l: "Cameras online", v: `${onlineCount} / ${cameras.length}` },
    { l: "Recording", v: String(onlineCount) },
    { l: "Motion alerts", v: String(events.length) },
    { l: date || "Date", v: time },
  ];

  return (
    <section id="platform" className="scroll-mt-24 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-7xl rounded-[2rem] bg-navy px-6 py-16 text-white sm:px-12">
        <SectionHead
          dark
          eyebrow="Live monitoring"
          title="Every camera. One calm view."
          text="Simulated feeds and sample data. No real cameras are connected in this demo."
        />

        <div className="mt-12 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {liveStats.map((s) => (
            <div
              key={s.l}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <p className="text-xs text-white/60">{s.l}</p>
              <p className="mt-1 font-mono text-xl tabular-nums">{s.v}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cameras.map((c, i) => (
            <button
              key={c.name}
              onClick={() => setActive(i)}
              className={`rounded-3xl border p-2 text-left transition-colors ${
                active === i
                  ? "border-teal bg-white/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <CameraFeed
                cam={c}
                time={time}
                motion={motion === i}
                className="aspect-video"
              />
              <div className="flex items-center justify-between px-2 pb-1 pt-3">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-white/60">{c.loc}</p>
                </div>
                <span
                  className={`text-xs ${c.online ? "text-teal" : "text-white/50"}`}
                >
                  {c.online ? "Recording" : "Offline"}
                </span>
              </div>
            </button>
          ))}
        </div>

        <Reveal className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 lg:col-span-2">
            <p className="text-xs text-white/60">Selected camera</p>
            <p className="mt-1 text-xl font-medium">{cam.name}</p>
            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              {[
                ["Location", cam.loc],
                [
                  "Status",
                  motion === active
                    ? "Motion detected"
                    : cam.online
                      ? "Normal"
                      : "Offline",
                ],
                ["Recording", cam.online ? "On" : "Off"],
                ["Resolution", "1080p (simulated)"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-white/60">{k}</dt>
                  <dd className="mt-1">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs text-white/60">Event log</p>
            <ul className="mt-3 space-y-2 text-sm">
              {events.length === 0 && (
                <li className="text-white/50">Waiting for simulated events</li>
              )}
              {events.map((e) => (
                <li key={e.t + e.text} className="flex gap-3">
                  <span className="font-mono text-white/60">{e.t}</span>
                  <span>{e.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* =====================================================================
   3. FEATURES
   ===================================================================== */

const featureList = [
  { icon: Activity, title: "AI Motion Detection", text: "Identify unusual movement and suspicious activities instantly." },
  { icon: ShieldAlert, title: "Intrusion Detection", text: "Receive immediate alerts when unauthorized individuals enter restricted areas." },
  { icon: BellRing, title: "Real-Time Alerts", text: "Get notified instantly about important security events." },
  { icon: Globe, title: "24/7 Live Monitoring", text: "Monitor your properties from anywhere at any time." },
  { icon: LayoutGrid, title: "Smart Camera Management", text: "Manage multiple CCTV cameras from a single dashboard." },
  { icon: TrendingUp, title: "Intelligent Analytics", text: "Understand activity patterns, security incidents, and camera performance." },
];

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
      <SectionHead
        eyebrow="Smart AI security"
        title="Everything you need to stay ahead"
        text="Detection, alerts and control, built into one platform."
      />
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {featureList.map((f, i) => (
          <Reveal key={f.title} delay={(i % 3) * 0.08} className="h-full">
            <div className="group h-full rounded-3xl border border-line bg-card p-7 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[var(--float)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal/15 text-brand transition-colors group-hover:bg-teal group-hover:text-navy">
                <f.icon size={22} strokeWidth={1.75} />
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

/* =====================================================================
   4. ANALYTICS (charts)
   ===================================================================== */

const analyticsStats = [
  { v: "24/7", l: "Monitoring" },
  { v: "99.9%", l: "Platform uptime" },
  { v: "120+", l: "Connected cameras" },
  { v: "350+", l: "Events monitored" },
];

const activityData = [
  { d: "Mon", motion: 42, alerts: 5 },
  { d: "Tue", motion: 58, alerts: 8 },
  { d: "Wed", motion: 47, alerts: 4 },
  { d: "Thu", motion: 71, alerts: 11 },
  { d: "Fri", motion: 64, alerts: 7 },
  { d: "Sat", motion: 38, alerts: 3 },
  { d: "Sun", motion: 29, alerts: 2 },
];

const byCamera = [
  { n: "Entrance", v: 64 },
  { n: "Parking", v: 48 },
  { n: "Reception", v: 38 },
  { n: "Office", v: 31 },
  { n: "Warehouse", v: 27 },
  { n: "Server", v: 9 },
];

const history = [
  { t: "10:32", cam: "Main Entrance", e: "Motion detected", s: "Reviewed" },
  { t: "09:58", cam: "Server Room", e: "Camera offline", s: "Open" },
  { t: "09:15", cam: "Parking Area", e: "Motion detected", s: "Reviewed" },
  { t: "08:41", cam: "Warehouse", e: "Intrusion alert", s: "Resolved" },
];

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: 12,
  color: "var(--fg)",
};

function Analytics() {
  return (
    <section id="analytics" className="scroll-mt-24 bg-raised py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHead
          eyebrow="Security analytics"
          title="Understand what happens, and when"
          text="Sample data shown for demonstration."
        />

        <div className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-4">
          {analyticsStats.map((s) => (
            <div key={s.l} className="text-center">
              <p className="text-4xl font-semibold tracking-tight sm:text-5xl">
                {s.v}
              </p>
              <p className="mt-1 text-sm text-fg2">{s.l}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <div className="h-full rounded-3xl border border-line bg-card p-6">
              <p className="font-medium">Activity trends</p>
              <p className="text-sm text-fg3">Motion events and alerts this week</p>
              <div className="mt-4 h-64 text-fg3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityData}>
                    <defs>
                      <linearGradient id="gm" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#27c6b5" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#27c6b5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="currentColor"
                      strokeOpacity={0.15}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="d"
                      tick={{ fill: "currentColor", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "currentColor", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="motion"
                      stroke="#27c6b5"
                      strokeWidth={2}
                      fill="url(#gm)"
                    />
                    <Area
                      type="monotone"
                      dataKey="alerts"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fill="none"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="h-full rounded-3xl border border-line bg-card p-6">
              <p className="font-medium">Events by camera</p>
              <p className="text-sm text-fg3">Camera performance</p>
              <div className="mt-4 h-64 text-fg3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byCamera} layout="vertical" margin={{ left: 8 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="n"
                      tick={{ fill: "currentColor", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={70}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ fill: "transparent" }}
                    />
                    <Bar dataKey="v" fill="#27c6b5" radius={6} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal className="mt-5">
          <div className="rounded-3xl border border-line bg-card p-6">
            <p className="font-medium">Security event history</p>
            <ul className="mt-4 divide-y divide-line">
              {history.map((h) => (
                <li
                  key={h.t}
                  className="grid grid-cols-[56px_1fr_auto] items-center gap-4 py-3 text-sm sm:grid-cols-[56px_160px_1fr_auto]"
                >
                  <span className="font-mono text-fg3">{h.t}</span>
                  <span className="hidden sm:block">{h.cam}</span>
                  <span className="text-fg2">{h.e}</span>
                  <span className="rounded-full bg-raised px-3 py-1 text-xs">
                    {h.s}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* =====================================================================
   5. HOW IT WORKS
   ===================================================================== */

const steps = [
  { icon: Plug, title: "Connect Your Cameras", text: "Connect your existing CCTV infrastructure." },
  { icon: Cpu, title: "Activate AI Monitoring", text: "Enable intelligent monitoring and automated detection." },
  { icon: BellRing, title: "Receive Instant Alerts", text: "Get notified when unusual activities are detected." },
  { icon: LayoutDashboard, title: "Stay in Control", text: "Monitor everything through one centralized dashboard." },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-24">
      <SectionHead eyebrow="How it works" title="Up and running in four steps" />

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
              <p className="mt-5 font-mono text-sm text-fg3">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 leading-7 text-fg2">{s.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* =====================================================================
   6. SOLUTIONS
   ===================================================================== */

const solutionList = [
  { icon: HomeIcon, title: "Smart Homes", text: "Keep an eye on entrances and your family's peace of mind.", hue: "rgba(39,198,181,0.35)" },
  { icon: Building2, title: "Corporate Offices", text: "Watch lobbies, floors and restricted rooms from one place.", hue: "rgba(96,165,250,0.35)" },
  { icon: ShoppingBag, title: "Shopping Malls", text: "Cover large public spaces with many cameras at once.", hue: "rgba(45,212,191,0.3)" },
  { icon: Warehouse, title: "Warehouses", text: "Track activity across aisles, docks and storage blocks.", hue: "rgba(96,165,250,0.3)" },
  { icon: Factory, title: "Industrial Facilities", text: "Monitor restricted zones and equipment areas.", hue: "rgba(39,198,181,0.3)" },
  { icon: GraduationCap, title: "Educational Institutions", text: "Oversee campuses, gates and common areas.", hue: "rgba(125,211,252,0.3)" },
];

function Solutions() {
  return (
    <section id="solutions" className="scroll-mt-24 bg-raised py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHead
          eyebrow="Solutions"
          title="Built for every kind of space"
          text="From a single front door to a full campus."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {solutionList.map((s, i) => (
            <Reveal key={s.title} delay={(i % 3) * 0.08}>
              <div className="group relative aspect-[4/3] overflow-hidden rounded-3xl bg-navy">
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
      </div>
    </section>
  );
}

/* =====================================================================
   7. TRUST (dark section)
   ===================================================================== */

const trustList = [
  { icon: ShieldCheck, title: "Secure video access", text: "Only signed-in users can open camera views." },
  { icon: Lock, title: "Encrypted transmission", text: "Data is designed to travel over encrypted connections." },
  { icon: KeyRound, title: "Role-based access", text: "Operators and admins see only what their role needs." },
  { icon: LayoutGrid, title: "Centralized monitoring", text: "One dashboard instead of many scattered tools." },
  { icon: Server, title: "Reliable infrastructure", text: "Built to keep monitoring running around the clock." },
  { icon: EyeOff, title: "Privacy-focused design", text: "Access and actions are limited and recorded." },
];

function Trust() {
  return (
    <section className="px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-7xl rounded-[2rem] bg-navy px-6 py-16 text-white sm:px-12">
        <SectionHead
          dark
          eyebrow="Trust and security"
          title="Designed with security first"
          text="Describes how the product is designed. No certifications are claimed here."
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trustList.map((t, i) => (
            <Reveal key={t.title} delay={(i % 3) * 0.08}>
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

/* =====================================================================
   8. TESTIMONIALS
   ===================================================================== */

const quotes = [
  { name: "Aarav Mehta", role: "Facility Head, Northwind Logistics", text: "One screen for every gate and aisle. Reviewing an alert now takes seconds, not a walk across the site." },
  { name: "Sara Whitfield", role: "Operations Lead, Brightside Campus", text: "The alerts are clear and the event log means nothing gets lost between shifts." },
  { name: "Daniel Okoye", role: "Owner, Harbor Lane Retail", text: "Setup was simple, and I can check all my stores from my phone." },
];

function Testimonials() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <SectionHead
        eyebrow="Testimonials"
        title="What teams say"
        text="Placeholder quotes from fictional people and organizations."
      />
      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {quotes.map((q, i) => (
          <Reveal key={q.name} delay={i * 0.1}>
            <figure className="flex h-full flex-col rounded-3xl border border-line bg-card p-7">
              <div className="flex gap-1 text-amber-400" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, n) => (
                  <Star key={n} size={16} className="fill-current" />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 leading-7 text-fg2">
                {q.text}
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-sm font-medium text-teal">
                  {q.name[0]}
                </span>
                <span>
                  <span className="block text-sm font-medium">{q.name}</span>
                  <span className="block text-xs text-fg3">{q.role}</span>
                </span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* =====================================================================
   9. FINAL CTA
   ===================================================================== */

function FinalCta() {
  return (
    <section className="px-4 pb-24 sm:px-6">
      <Reveal>
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-navy px-6 py-20 text-center text-white sm:px-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_70%_at_50%_100%,rgba(39,198,181,0.35),transparent)]" />
          <svg
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20"
            width="640"
            height="640"
            viewBox="0 0 640 640"
            aria-hidden="true"
          >
            {[120, 200, 280, 320].map((r) => (
              <circle key={r} cx="320" cy="320" r={r} fill="none" stroke="#27c6b5" />
            ))}
          </svg>
          <div className="relative">
            <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Your World. Under Watch. Always.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-white/70">
              Take control of your security with intelligent monitoring designed
              for a smarter, safer future.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-teal px-7 font-medium text-navy transition-opacity hover:opacity-90"
            >
              Get Started Today <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* =====================================================================
   10. FOOTER
   ===================================================================== */

const footerCols = [
  { h: "Platform", l: [["Live monitoring", "#platform"], ["Features", "#features"], ["Analytics", "#analytics"], ["How it works", "#how-it-works"]] },
  { h: "Solutions", l: [["Smart homes", "#solutions"], ["Offices", "#solutions"], ["Warehouses", "#solutions"], ["Campuses", "#solutions"]] },
  { h: "Resources", l: [["Log in", "/login"], ["Sign up", "/signup"], ["How it works", "#how-it-works"]] },
];

function Footer() {
  return (
    <footer id="contact" className="scroll-mt-24 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-fg2">
            See Everything. Secure Everything.
          </p>
          <a
            href="mailto:hello@spectrixai.example"
            className="mt-4 inline-flex items-center gap-2 text-sm text-fg2 hover:text-fg"
          >
            <Mail size={16} /> hello@spectrixai.example
          </a>
          <div className="mt-4 flex gap-2">
            {[
              ["X", "X"],
              ["LinkedIn", "in"],
              ["GitHub", "Gh"],
            ].map(([n, s]) => (
              <a
                key={n}
                href="#"
                aria-label={n}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-xs text-fg2 transition-colors hover:bg-raised hover:text-fg"
              >
                {s}
              </a>
            ))}
          </div>
        </div>
        {footerCols.map((c) => (
          <div key={c.h}>
            <p className="text-sm font-semibold">{c.h}</p>
            <ul className="mt-4 space-y-3 text-sm text-fg2">
              {c.l.map(([label, href]) => (
                <li key={label}>
                  {href.startsWith("/") ? (
                    <Link href={href} className="hover:text-fg">
                      {label}
                    </Link>
                  ) : (
                    <a href={href} className="hover:text-fg">
                      {label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-fg3 sm:flex-row">
          <p>© 2026 SpectrixAI</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-fg">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-fg">
              Terms and Conditions
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* =====================================================================
   PAGE: sab sections yahan jude hain
   ===================================================================== */

export default function Home() {
  return (
    <div id="top" className="min-h-screen bg-bg text-fg">
      <IntroGate />
      <Navbar />
      <main>
        <Hero />
        <LiveMonitor />
        <Features />
        <Analytics />
        <HowItWorks />
        <Solutions />
        <Trust />
        <Testimonials />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}