"use client";

import { useEffect, useState } from "react";
import { checkHealth, type HealthResult } from "@/lib/api";

const POLL_MS = 15_000;

/** API connectivity (GET /health). This says nothing about cameras: it only shows whether the backend answers. */
export default function BackendStatus() {
  const [health, setHealth] = useState<HealthResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const run = async () => {
      const result = await checkHealth(controller.signal).catch(() => null);
      if (!cancelled && result) setHealth(result);
    };
    void run();
    const timer = setInterval(run, POLL_MS);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(timer);
    };
  }, []);

  let dot = "bg-slate-400";
  let label = "API: checking…";
  let tone = "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300";
  let title = "Checking GET /health";
  if (health?.ok) {
    dot = "bg-green-500";
    label = "API connected";
    tone = "border-green-500/40 text-green-700 dark:text-green-400";
    title = "GET /health answered OK, including its storage check.";
  } else if (health) {
    dot = "bg-red-500";
    tone = "border-red-500/40 text-red-700 dark:text-red-400";
    title = health.error.message;
    label =
      health.error.kind === "config"
        ? "API not configured"
        : health.error.kind === "network"
          ? "API unreachable"
          : health.error.code === "storage_unavailable"
            ? "API up, storage down"
            : "API error";
  }

  return (
    <span
      role="status"
      title={title}
      data-testid="backend-status"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${tone}`}
    >
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
