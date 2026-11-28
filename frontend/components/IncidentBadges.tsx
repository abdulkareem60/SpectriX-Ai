import type { IncidentStatus, ReviewOutcome } from "@/types/incident";

const statusLabel: Record<IncidentStatus, string> = { new: "New", acknowledged: "Acknowledged" };
const statusClass: Record<IncidentStatus, string> = {
  new: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/40",
  acknowledged: "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/40",
};

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${statusClass[status] ?? statusClass.acknowledged}`}>
      {statusLabel[status] ?? status}
    </span>
  );
}

// Detections are only *possible* incidents until an operator reviews them.
const reviewLabel: Record<ReviewOutcome, string> = {
  unreviewed: "Possible (unreviewed)",
  confirmed: "Confirmed",
  false_alert: "False alert",
  uncertain: "Uncertain",
};

export function ReviewOutcomeLabel({ outcome }: { outcome: ReviewOutcome }) {
  return <span className="text-xs text-slate-500 dark:text-slate-400">{reviewLabel[outcome] ?? outcome}</span>;
}
