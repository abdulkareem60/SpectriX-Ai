// Ported from Musaykah's landing page (feature/incident-review-ui). Drawn in SVG: this is an
// illustration of the product, not a camera stream, and every use of it is labelled as such.

export type SceneKind = "entrance" | "parking" | "warehouse";

function Scene({ kind, person }: { kind: SceneKind; person: boolean }) {
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
      {person && (
        <>
          {/* Restricted zone outline, drawn the way the zone editor stores it */}
          <polygon points="200,118 300,112 316,178 188,178" fill="rgba(239,68,68,0.15)" stroke="#ef4444" strokeDasharray="6 4" />
          <circle cx="248" cy="104" r="8" fill="#7f97b3" />
          <rect x="238" y="114" width="20" height="44" rx="8" fill="#7f97b3" />
        </>
      )}
    </>
  );
}

export default function CameraIllustration({
  name,
  kind,
  person = false,
  className = "",
}: {
  name: string;
  kind: SceneKind;
  person?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-[#0c1624] ${className}`}>
      <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" className="block h-full w-full" aria-hidden="true">
        <Scene kind={kind} person={person} />
      </svg>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0 1px, transparent 1px 3px)" }}
      />
      {person && (
        <div className="absolute left-[73%] top-[54%] h-[34%] w-[10%] rounded-sm border-2 border-amber-400">
          <span className="absolute -top-5 left-[-2px] whitespace-nowrap bg-amber-400 px-1.5 text-[11px] font-medium text-black">
            Person in zone
          </span>
        </div>
      )}
      <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[11px] text-white backdrop-blur">{name}</span>
      <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[11px] text-white/80 backdrop-blur">
        Illustration
      </span>
    </div>
  );
}
