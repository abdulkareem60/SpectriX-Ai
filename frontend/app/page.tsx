"use client";

import Link from "next/link";
import { Wifi, AlertTriangle, Database } from "lucide-react";
import CameraCard, { CameraInfo } from "@/components/CameraCard";

const cameras: CameraInfo[] = [
  { id: "CAM-01", status: "ACTIVE" },
  { id: "CAM-02", status: "ACTIVE" },
  { id: "CAM-03", status: "ACTIVE" },
  { id: "CAM-04", status: "OFFLINE" },
];

export default function DashboardPage() {
  const incidents: { id: string; camera_id: string; status: string; occurred_at: string }[] = [];

  return (
    <div className="p-6 space-y-6 min-h-full bg-slate-50 dark:bg-[#020617]">

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Total Cameras */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800
                        bg-white dark:bg-slate-900/80 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase mb-2">
                Total Cameras
              </p>
              <p className="text-4xl font-bold text-cyan-500 dark:text-cyan-400 leading-none">4</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">/ 4 Online</p>
            </div>
            <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Wifi size={20} className="text-cyan-500 dark:text-cyan-400" />
            </div>
          </div>
        </div>

        {/* Active Zones */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800
                        bg-white dark:bg-slate-900/80 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase mb-2">
                Active Zones
              </p>
              <p className="text-4xl font-bold text-amber-500 dark:text-amber-400 leading-none">2</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">Restricted</p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle size={20} className="text-amber-500 dark:text-amber-400" />
            </div>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800
                        bg-white dark:bg-slate-900/80 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase mb-2">
                Active Alerts
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded
                                 bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400">
                  None Pending
                </span>
              </div>
              <p className="text-4xl font-bold text-slate-700 dark:text-slate-200 leading-none mt-2">0</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">Alerts</p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-700/40
                            border border-slate-200 dark:border-slate-700">
              <Database size={20} className="text-slate-500 dark:text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Cameras + Recent Activity ──────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-5">

        {/* 2×2 Camera Grid */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cameras.map((cam) => (
            <CameraCard key={cam.id} camera={cam} />
          ))}
        </div>

        {/* Recent Activity Panel */}
        <aside className="w-full lg:w-72 shrink-0">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800
                          bg-white dark:bg-slate-900/80
                          flex flex-col h-full min-h-[340px]">

            {/* Header */}
            <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                Recent Activity
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">• Asia/Karachi (PKT)</p>
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              {incidents.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500">No incidents yet</p>
              ) : (
                <ul className="w-full divide-y divide-slate-100 dark:divide-slate-800">
                  {incidents.slice(0, 6).map((inc) => (
                    <li key={inc.id} className="py-2.5 text-left text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {inc.camera_id}
                        </span>
                        <span className="text-[10px] text-red-500 dark:text-red-400 uppercase font-bold">
                          {inc.status}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[10px] font-mono mt-0.5">
                        {inc.occurred_at}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3.5 border-t border-slate-200 dark:border-slate-800">
              <Link
                href="/incidents"
                className="flex items-center justify-center w-full px-4 py-2 rounded-lg
                           border border-slate-300 dark:border-slate-700
                           text-slate-600 dark:text-slate-300
                           hover:border-slate-400 dark:hover:border-slate-600
                           hover:text-slate-900 dark:hover:text-white
                           text-xs font-semibold transition-all duration-150"
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
