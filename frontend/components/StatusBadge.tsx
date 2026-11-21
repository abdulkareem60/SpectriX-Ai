export type StatusType = "ACTIVE" | "OFFLINE" | "BREACH" | "PERSON DETECTED";

interface StatusBadgeProps {
  status: StatusType | string;
}

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-green-500/15 text-green-400 border border-green-500/40",
  OFFLINE: "bg-slate-600/20 text-slate-400 border border-slate-600/40",
  BREACH: "bg-red-500/15 text-red-400 border border-red-500/40 animate-pulse",
  "PERSON DETECTED": "bg-red-500/15 text-red-400 border border-red-500/40 animate-pulse",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const classes =
    statusStyles[status] ?? "bg-slate-600/20 text-slate-400 border border-slate-600/40";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase ${classes}`}
    >
      {status}
    </span>
  );
}
