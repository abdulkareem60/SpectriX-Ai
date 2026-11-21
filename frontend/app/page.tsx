"use client";

import Link from "next/link";
import { AlertTriangle, Bell, Camera } from "lucide-react";
import CameraCard, { CameraInfo } from "@/components/CameraCard";
import IncidentsStateMessage from "@/components/IncidentsStateMessage";
import { IncidentStatusBadge } from "@/components/IncidentBadges";
import StatusBadge from "@/components/StatusBadge";
import { formatPKT } from "@/lib/api";
import { useIncidents } from "@/lib/useIncidents";

// SAMPLE layout only: the API has no camera list or camera status yet.
const sampleCameras: CameraInfo[] = [
  { id: "cam-sample-01", name: "Sample camera 1" },
  { id: "cam-sample-02", name: "Sample camera 2" },
  { id: "cam-sample-03", name: "Sample camera 3" },
  { id: "cam-sample-04", name: "Sample camera 4" },
];

const REFRESH_MS = 15_000;
const NEW_COUNT_LIMIT = 100; // API maximum page size

const card = "rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5";
const cardLabel = "text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase mb-2";

export default function DashboardPage() {
  const recent = useIncidents({ limit: 6, refreshMs: REFRESH_MS });
  const unhandled = useIncidents({ limit: NEW_COUNT_LIMIT, status: "new", refreshMs: REFRESH_MS });

  return (
    <div className="p-6 space-y-6 min-h-full bg-slate-50 dark:bg-[#020617]">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* New incidents: real, from GET /v1/incidents?status=new */}
        <div className={card} data-testid="kpi-new-incidents">
          <div className="flex items-start justify-between">
            <div>
              <p className={cardLabel}>New incidents</p>
              {unhandled.state.phase === "ready" ? (
                <>
                  <p className="text-4xl font-bold text-red-600 dark:text-red-400 leading-none">
                    {unhandled.state.items.length}
                    {unhandled.state.nextCursor ? "+" : ""}
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5">Not yet acknowledged</p>
                </>
              ) : (
                <>
                  <p className="text-4xl font-bold text-slate-400 leading-none">—</p>
                  <p className="text-xs text-slate-500 mt-1.5">
                    {unhandled.state.phase === "loading"
                      ? "Loading…"
                      : unhandled.state.phase === "signed-out"
                        ? "Sign in to see incidents"
                        : "Unavailable (see Recent Activity)"}
                  </p>
                </>
              )}
            </div>
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <Bell size={20} className="text-red-500" />
            </div>
          </div>
        </div>

        {/* Not available from the API yet: shown as such, never as a number. */}
        <div className={card}>
          <div className="flex items-start justify-between">
            <div>
              <p className={cardLabel}>Cameras online</p>
              <p className="text-4xl font-bold text-slate-400 leading-none">—</p>
              <p className="text-xs text-slate-500 mt-1.5">Not reported by the API yet</p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-500/10 border border-slate-500/20">
              <Camera size={20} className="text-slate-400" />
            </div>
          </div>
        </div>
        <div className={card}>
          <div className="flex items-start justify-between">
            <div>
              <p className={cardLabel}>Restricted zones</p>
              <p className="text-4xl font-bold text-slate-400 leading-none">—</p>
              <p className="text-xs text-slate-500 mt-1.5">Needs a zone listing endpoint</p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-500/10 border border-slate-500/20">
              <AlertTriangle size={20} className="text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        <section className="flex-1 space-y-3" aria-label="Cameras (sample layout)">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Cameras</h2>
            <StatusBadge status="SAMPLE" />
            <span className="text-xs text-slate-500">Placeholder layout, not live data</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sampleCameras.map((cam) => (
              <CameraCard key={cam.id} camera={cam} />
            ))}
          </div>
        </section>

        <aside className="w-full lg:w-80 shrink-0">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 flex flex-col h-full min-h-[340px]">
            <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">Recent Activity</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Latest incidents · Asia/Karachi (PKT)
                {recent.state.phase === "ready" && ` · updated ${recent.state.loadedAt.toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour12: false })}`}
              </p>
            </div>

            <div className="flex-1 flex flex-col" data-testid="recent-activity">
              {recent.state.phase !== "ready" ? (
                <div className="flex-1 flex items-center justify-center">
                  <IncidentsStateMessage state={recent.state} onRetry={() => void recent.reload()} />
                </div>
              ) : recent.state.items.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-6 text-center" data-testid="incidents-empty">
                  <p className="text-sm text-slate-400 dark:text-slate-500">No incidents recorded yet</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800 px-4">
                  {recent.state.items.map((inc) => (
                    <li key={inc.id} className="py-2.5 text-xs" data-testid="recent-incident">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">{inc.camera_id}</span>
                        <IncidentStatusBadge status={inc.status} />
                      </div>
                      <p className="text-slate-500 mt-0.5 truncate">
                        Zone {inc.zone_id} · score {inc.detection_score.toFixed(2)}
                      </p>
                      <p className="text-slate-400 text-[10px] font-mono mt-0.5">{formatPKT(inc.occurred_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="px-4 py-3.5 border-t border-slate-200 dark:border-slate-800">
              <Link
                href="/incidents"
                className="flex items-center justify-center w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-600 text-xs font-semibold"
              >
                View All Incidents
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
