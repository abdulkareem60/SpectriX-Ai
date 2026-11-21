"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Camera, Volume2, VolumeX } from "lucide-react";

/* ---------- Sound effects (Web Audio API, koi audio file nahi chahiye) ---------- */

type Sfx = {
  key: () => void;
  beep: () => void;
  swoosh: () => void;
  bass: () => void;
  resume: () => void;
  setMuted: (m: boolean) => void;
  close: () => void;
};

function createSfx(): Sfx {
  let ctx: AudioContext | null = null;
  let muted = false;
  let noise: AudioBuffer | null = null;

  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    ctx = new AC();
  } catch {
    ctx = null;
  }

  const ready = () => !!ctx && ctx.state === "running" && !muted;

  const getNoise = (c: AudioContext) => {
    if (!noise) {
      noise = c.createBuffer(1, c.sampleRate * 3, c.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noise;
  };

  const noiseBurst = (
    dur: number,
    type: BiquadFilterType,
    freq: number,
    vol: number
  ) => {
    if (!ready() || !ctx) return;
    const c = ctx;
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = getNoise(c);
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(c.destination);
    src.start(t);
    src.stop(t + dur);
  };

  const tone = (
    type: OscillatorType,
    f1: number,
    f2: number,
    dur: number,
    vol: number
  ) => {
    if (!ready() || !ctx) return;
    const c = ctx;
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + dur);
  };

  return {
    key: () => noiseBurst(0.03, "highpass", 2500, 0.12),
    beep: () => tone("square", 880, 880, 0.08, 0.05),
    swoosh: () => {
      if (!ready() || !ctx) return;
      const c = ctx;
      const t = c.currentTime;
      const src = c.createBufferSource();
      src.buffer = getNoise(c);
      const f = c.createBiquadFilter();
      f.type = "bandpass";
      f.Q.value = 2;
      f.frequency.setValueAtTime(300, t);
      f.frequency.exponentialRampToValueAtTime(5000, t + 2);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 1.8);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.1);
      src.connect(f);
      f.connect(g);
      g.connect(c.destination);
      src.start(t);
      src.stop(t + 2.1);
    },
    bass: () => {
      tone("sine", 55, 50, 3, 0.45);
      tone("sawtooth", 110, 100, 2.5, 0.06);
    },
    resume: () => {
      ctx?.resume().catch(() => {});
    },
    setMuted: (m: boolean) => {
      muted = m;
    },
    close: () => {
      ctx?.close().catch(() => {});
    },
  };
}

/* ---------- Helpers ---------- */

const TAGLINE = "Your Security. Our Intelligence.";
const FRAME_COUNT = 6;
const NOISE_SET = "01ABCDEF#$%&@<>/\\{}[]";

const randomChars = (n: number) =>
  Array.from(
    { length: n },
    () => NOISE_SET[Math.floor(Math.random() * NOISE_SET.length)]
  ).join("");

const css = `
@keyframes blink{50%{opacity:0}}
@keyframes pulseGlow{0%,100%{opacity:.35;text-shadow:0 0 0 #38bdf8}50%{opacity:.95;text-shadow:0 0 12px #38bdf8}}
@keyframes glitch{
  0%{transform:translate(0,0);filter:blur(1px) hue-rotate(0deg)}
  25%{transform:translate(-8px,3px) skewX(4deg);filter:blur(2px) hue-rotate(20deg)}
  50%{transform:translate(6px,-4px);filter:blur(1px) hue-rotate(-20deg)}
  75%{transform:translate(-3px,2px) skewX(-3deg);filter:blur(2px)}
  100%{transform:translate(0,0);filter:blur(1px)}
}
@keyframes logoIn{
  from{opacity:0;transform:scale(1.25);filter:blur(14px) brightness(3)}
  to{opacity:1;transform:scale(1);filter:blur(0) brightness(1)}
}
@keyframes stream{from{transform:translateY(-100%)}to{transform:translateY(110vh)}}
@keyframes scan{from{top:-5%}to{top:105%}}
`;

/* ---------- Scene 2 ke visuals ---------- */

function MatrixRain() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const size = 16;
    const cols = Math.floor(canvas.width / size);
    const drops = Array.from({ length: cols }, () => Math.random() * -20);
    const chars = "01アイウエオカキクケコ<>/{}#$%";

    const id = setInterval(() => {
      c.fillStyle = "rgba(0,0,0,0.12)";
      c.fillRect(0, 0, canvas.width, canvas.height);
      c.fillStyle = "#38bdf8";
      c.font = `${size}px monospace`;
      drops.forEach((y, i) => {
        c.fillText(
          chars[Math.floor(Math.random() * chars.length)],
          i * size,
          y * size
        );
        drops[i] =
          y * size > canvas.height && Math.random() > 0.95 ? 0 : y + 1;
      });
    }, 45);

    return () => clearInterval(id);
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}

function CctvFrame({ index }: { index: number }) {
  switch (index) {
    case 0:
      return <MatrixRain />;

    case 1: // server racks
      return (
        <div className="grid h-full w-full grid-cols-4 gap-6 p-10 sm:p-16">
          {Array.from({ length: 4 }).map((_, c) => (
            <div
              key={c}
              className="flex flex-col gap-2 border border-sky-500/50 p-3"
            >
              {Array.from({ length: 10 }).map((_, r) => (
                <div
                  key={r}
                  className="flex items-center gap-2 border border-sky-500/30 px-2 py-1"
                >
                  <span
                    className="h-2 w-2 rounded-full bg-sky-400"
                    style={{
                      animation: `blink ${0.3 + ((r * (c + 1)) % 5) * 0.15}s steps(1) infinite`,
                    }}
                  />
                  <span className="h-1 flex-1 bg-sky-500/30" />
                </div>
              ))}
            </div>
          ))}
        </div>
      );

    case 2: // padlock
      return (
        <div className="flex h-full w-full items-center justify-center">
          <div className="relative flex items-center justify-center">
            <div className="absolute h-72 w-72 rounded-full border border-sky-500/40" />
            <div className="absolute h-96 w-96 rounded-full border border-dashed border-sky-500/30" />
            <Lock size={150} strokeWidth={1.2} className="text-sky-400" />
          </div>
        </div>
      );

    case 3: // data streams
      return (
        <div className="relative h-full w-full overflow-hidden">
          {Array.from({ length: 28 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 w-0.5"
              style={{
                left: `${i * 3.6}%`,
                height: `${20 + ((i * 13) % 40)}%`,
                background: "linear-gradient(to bottom, transparent, #38bdf8)",
                animation: `stream ${0.8 + (i % 5) * 0.3}s linear infinite`,
                animationDelay: `${(i % 7) * -0.2}s`,
              }}
            />
          ))}
        </div>
      );

    case 4: // camera grid
      return (
        <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-3 p-8 sm:p-12">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="relative flex items-center justify-center overflow-hidden border border-sky-500/40"
            >
              <Camera size={44} className="text-sky-400/70" />
              <span className="absolute left-2 top-1 text-[10px] text-sky-300">
                CAM-{String(i + 1).padStart(2, "0")}
              </span>
              <div
                className="absolute left-0 right-0 h-0.5 bg-sky-400/60"
                style={{
                  animation: `scan ${1 + (i % 3) * 0.4}s linear infinite`,
                }}
              />
            </div>
          ))}
        </div>
      );

    default: // binary wall
      return (
        <p className="break-all p-4 text-xl leading-6 text-sky-500/60">
          {Array.from({ length: 900 }, (_, i) =>
            (i * 7 + 3) % 5 < 2 ? "1" : "0"
          ).join(" ")}
        </p>
      );
  }
}

/* ---------- Scene 3 ka logo ---------- */

function Logo() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 64 64"
      style={{ filter: "drop-shadow(0 0 18px rgba(56,189,248,0.8))" }}
    >
      <defs>
        <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <path
        d="M32 4 L56 14 V32 C56 46 46 56 32 60 C18 56 8 46 8 32 V14 Z"
        fill="none"
        stroke="url(#metal)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M16 32 Q32 18 48 32 Q32 46 16 32 Z"
        fill="none"
        stroke="url(#metal)"
        strokeWidth="2.5"
      />
      <circle cx="32" cy="32" r="5" fill="url(#metal)" />
    </svg>
  );
}

/* ---------- Main component ---------- */

export default function IntroScreen() {
  const router = useRouter();
  const sfxRef = useRef<Sfx | null>(null);
  const leavingRef = useRef(false);

  const [phase, setPhase] = useState(0);
  const [noise, setNoise] = useState("");
  const [lines, setLines] = useState<string[]>([]);
  const [frame, setFrame] = useState(0);
  const [tagline, setTagline] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [muted, setMuted] = useState(false);

  const finish = useCallback(async () => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    try {
      sessionStorage.setItem("spectrix_intro_seen", "1");
    } catch {}
    setLeaving(true);
    await new Promise((r) => setTimeout(r, 600));
    router.replace("/");
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    const sfx = createSfx();
    sfxRef.current = sfx;

    // Browsers pehle user click/key ke bina sound allow nahi karte
    const unlock = () => sfx.resume();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    sfx.resume();

    const sleep = (ms: number) =>
      new Promise<void>((resolve, reject) =>
        setTimeout(() => {
          if (cancelled || leavingRef.current) reject(new Error("stop"));
          else resolve();
        }, ms)
      );

    const typeLine = async (text: string, speed: number) => {
      setLines((prev) => [...prev, ""]);
      for (let i = 1; i <= text.length; i++) {
        setLines((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = text.slice(0, i);
          return copy;
        });
        if (i % 3 === 0) sfx.key();
        await sleep(speed);
      }
      sfx.beep();
    };

    async function run() {
      /* Scene 1: Initialization (0 - 2s) */
      for (let i = 0; i < 10; i++) {
        setNoise(randomChars(60));
        sfx.key();
        await sleep(50);
      }
      setNoise("");
      await typeLine("> ESTABLISHING SECURE CONNECTION...", 22);
      await sleep(100);
      await typeLine("> WELCOME TO", 35);
      await sleep(250);

      /* Scene 2: Data carousel / CCTV glitch (2 - 4s) */
      setPhase(1);
      sfx.swoosh();
      for (let i = 0; i < 14; i++) {
        setFrame(i);
        await sleep(140);
      }

      /* Chhota black pause (carousel aur logo ke beech) */
      setPhase(2);
      await sleep(250);

      /* Scene 3: Logo & tagline */
      setPhase(3);
      sfx.bass();
      await sleep(600);
      for (let i = 1; i <= TAGLINE.length; i++) {
        setTagline(TAGLINE.slice(0, i));
        await sleep(45);
      }
      await sleep(1300);
      await finish();
    }

    run().catch(() => {});

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      sfx.close();
    };
  }, [finish]);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    sfxRef.current?.setMuted(next);
  }

  const cctvIndex = frame % FRAME_COUNT;

  return (
    <div
      className={`fixed inset-0 z-[100] overflow-hidden bg-black font-mono text-sky-400 transition-opacity duration-500 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      <style>{css}</style>

      {/* SCENE 1: terminal */}
      {phase === 0 && (
        <div className="absolute inset-0 flex flex-col justify-center gap-2 px-6 text-sm tracking-wider sm:px-20 sm:text-xl">
          {noise && <p className="break-all text-sky-500/40">{noise}</p>}
          {lines.map((l, i) => (
            <p
              key={i}
              className="text-cyan-300"
              style={{ textShadow: "0 0 10px #22d3ee" }}
            >
              {l}
              {i === lines.length - 1 && (
                <span
                  className="ml-1 inline-block h-5 w-3 translate-y-1 bg-cyan-300"
                  style={{ animation: "blink 0.8s steps(1) infinite" }}
                />
              )}
            </p>
          ))}
        </div>
      )}

      {/* SCENE 2: CCTV glitch carousel */}
      {phase === 1 && (
        <div
          key={frame}
          className="absolute inset-0"
          style={{ animation: "glitch .14s steps(2) 1" }}
        >
          <div
            style={{ filter: "blur(1.2px) contrast(1.3)" }}
            className="absolute inset-0"
          >
            <CctvFrame index={cctvIndex} />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-sky-500/20 mix-blend-color" />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "repeating-linear-gradient(0deg, rgba(0,0,0,0.35) 0, rgba(0,0,0,0.35) 1px, transparent 1px, transparent 3px)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle, transparent 40%, rgba(0,0,0,0.85) 100%)",
            }}
          />
          <div className="absolute left-6 top-6 text-xs text-sky-300 sm:text-sm">
            <span
              className="text-red-500"
              style={{ animation: "blink 1s steps(1) infinite" }}
            >
              ●
            </span>{" "}
            REC &nbsp; CAM-0{cctvIndex + 1}
          </div>
        </div>
      )}

      {/* SCENE 3: logo + tagline */}
      {phase === 3 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          <div className="absolute h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
          <div
            className="relative flex flex-col items-center gap-5"
            style={{ animation: "logoIn 1.2s ease-out both" }}
          >
            <Logo />
            <h1
              className="text-4xl font-bold tracking-[0.3em] sm:text-6xl"
              style={{
                backgroundImage:
                  "linear-gradient(to bottom, #ffffff, #bae6fd 50%, #2563eb)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              SPECTRIX AI
            </h1>
          </div>
          <p className="relative mt-8 h-8 font-sans text-sm font-light tracking-[0.25em] text-slate-300 sm:text-xl">
            {tagline}
            <span
              className="ml-1 inline-block h-4 w-0.5 translate-y-0.5 bg-slate-300"
              style={{ animation: "blink 0.8s steps(1) infinite" }}
            />
          </p>
        </div>
      )}

      {/* Sound toggle */}
      <button
        onClick={toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        className="absolute right-6 top-6 text-sky-400/60 hover:text-sky-300"
      >
        {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>

      {/* Skip button */}
      <button
        onClick={finish}
        className="absolute bottom-6 right-6 text-sm tracking-widest text-sky-400 hover:text-white"
        style={{ animation: "pulseGlow 2s ease-in-out infinite" }}
      >
        [ SKIP &gt; ]
      </button>
    </div>
  );
}