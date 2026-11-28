export type StatusType = "NEW" | "ACKNOWLEDGED" | "SAMPLE" | "UNKNOWN";

interface StatusBadgeProps {
  status: StatusType | string;
}

const statusStyles: Record<string, string> = {
  NEW: "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/40",
  ACKNOWLEDGED: "bg-slate-500/15 text-slate-600 dark:text-slate-300 border border-slate-500/40",
  SAMPLE: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40",
  UNKNOWN: "bg-slate-600/20 text-slate-500 dark:text-slate-400 border border-slate-600/40",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const key = status.toUpperCase();
  const classes = statusStyles[key] ?? statusStyles.UNKNOWN;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase ${classes}`}
    >
      {status}
    </span>
  );
}
