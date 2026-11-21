"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import IncidentsStateMessage from "@/components/IncidentsStateMessage";
import { IncidentStatusBadge, ReviewOutcomeLabel } from "@/components/IncidentBadges";
import { formatPKT } from "@/lib/api";
import { useIncidents } from "@/lib/useIncidents";
import type { IncidentStatus } from "@/types/incident";

const PAGE_SIZE = 25;

export default function IncidentsPage() {
  const [status, setStatus] = useState<IncidentStatus | "">("");
  const { state, reload, loadMore, loadingMore } = useIncidents({ limit: PAGE_SIZE, status: status || undefined });

  return (
    <div className="p-6 space-y-4 min-h-full bg-slate-50 dark:bg-[#020617]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Incidents</h1>
          <p className="text-xs text-slate-500">Newest first · times in Asia/Karachi (PKT) · detections are possible incidents until reviewed</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-600 dark:text-slate-300">
            Status{" "}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as IncidentStatus | "")}
              className="ml-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs"
            >
              <option value="">All</option>
              <option value="new">New</option>
              <option value="acknowledged">Acknowledged</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => void reload()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 overflow-hidden">
        {state.phase !== "ready" ? (
          <IncidentsStateMessage state={state} onRetry={() => void reload()} />
        ) : state.items.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400" data-testid="incidents-empty">
            {status ? `No ${status} incidents.` : "No incidents recorded yet."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" data-testid="incidents-table">
              <thead className="bg-slate-50 dark:bg-slate-900 text-left text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 font-semibold">Occurred</th>
                  <th className="px-3 py-2 font-semibold">Camera</th>
                  <th className="px-3 py-2 font-semibold">Zone</th>
                  <th className="px-3 py-2 font-semibold">Track</th>
                  <th className="px-3 py-2 font-semibold">Score</th>
                  <th className="px-3 py-2 font-semibold">Events</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {state.items.map((inc) => (
                  <tr key={inc.id} data-testid="incident-row">
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{formatPKT(inc.occurred_at)}</td>
                    <td className="px-3 py-2">{inc.camera_id}</td>
                    <td className="px-3 py-2">{inc.zone_id}</td>
                    <td className="px-3 py-2">{inc.track_id}</td>
                    <td className="px-3 py-2">{inc.detection_score.toFixed(2)}</td>
                    <td className="px-3 py-2">{inc.event_count}</td>
                    <td className="px-3 py-2">
                      <IncidentStatusBadge status={inc.status} />
                    </td>
                    <td className="px-3 py-2">
                      <ReviewOutcomeLabel outcome={inc.review_outcome} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {state.phase === "ready" && state.nextCursor && (
        <div className="flex justify-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void loadMore()}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
