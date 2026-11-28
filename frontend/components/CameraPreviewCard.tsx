"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CameraOff, Loader, LogIn } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { ApiError, fetchCameraPreview } from "@/lib/api";

/** How often the tile asks the API for the latest frame. The worker sends about one per second. */
const POLL_MS = 1000;
/** A frame older than this (by the API's clock) is shown as stale: the worker or camera has stopped. */
export const STALE_AFTER_SECONDS = 10;

type View =
  | { phase: "loading" }
  | { phase: "waiting" }
  | { phase: "frame"; url: string; ageSeconds: number; capturedAt: string | null }
  | { phase: "error"; error: ApiError; url: string | null };

function timePKT(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour12: false }) + " PKT";
}

function ageText(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  return `${Math.round(seconds / 3600)} h ago`;
}

/**
 * "Camera preview" tile: polls GET /v1/cameras/{id}/preview with the operator's ID token and shows the latest
 * JPEG the vision worker analysed. It is a periodically refreshed picture, not video. The browser never sees
 * the camera's address or the worker key.
 */
export default function CameraPreviewCard({ cameraId }: { cameraId: string }) {
  const { state: auth, getToken } = useAuth();
  const [view, setView] = useState<View>({ phase: "loading" });
  const urlRef = useRef<string | null>(null);
  const signedIn = auth.status === "signed-in";

  useEffect(() => {
    if (!signedIn) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const replaceUrl = (next: string | null) => {
      if (urlRef.current && urlRef.current !== next) URL.revokeObjectURL(urlRef.current);
      urlRef.current = next;
    };

    const poll = async () => {
      if (stopped) return;
      if (document.visibilityState === "visible") {
        try {
          const token = await getToken();
          const result = await fetchCameraPreview(token, cameraId, controller.signal);
          if (stopped) return;
          if (result.kind === "waiting") {
            replaceUrl(null);
            setView({ phase: "waiting" });
          } else {
            const url = URL.createObjectURL(result.image);
            setView({ phase: "frame", url, ageSeconds: result.ageSeconds, capturedAt: result.capturedAt });
            replaceUrl(url);
          }
        } catch (err) {
          if (stopped || (err instanceof DOMException && err.name === "AbortError")) return;
          const error = err instanceof ApiError ? err : new ApiError("server", err instanceof Error ? err.message : "Unknown error.");
          setView({ phase: "error", error, url: urlRef.current });
        }
      }
      timer = setTimeout(poll, POLL_MS);
    };
    void poll();

    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(timer);
      replaceUrl(null);
    };
  }, [signedIn, cameraId, getToken]);

  const shown: View = signedIn ? view : { phase: "loading" };
  const stale = shown.phase === "frame" && shown.ageSeconds > STALE_AFTER_SECONDS;
  const imageUrl = shown.phase === "frame" ? shown.url : shown.phase === "error" ? shown.url : null;

  let badge = { text: "Waiting", cls: "bg-slate-500/15 text-slate-500 dark:text-slate-300 border-slate-500/40" };
  if (shown.phase === "frame" && !stale) badge = { text: "Updating", cls: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/40" };
  if (stale) badge = { text: "Stale", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40" };
  if (shown.phase === "error") badge = { text: "Unavailable", cls: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/40" };

  let footer = "";
  if (shown.phase === "frame") {
    const at = timePKT(shown.capturedAt);
    footer = stale ? `Last frame ${ageText(shown.ageSeconds)}` : at ? `Frame from ${at}` : `Frame ${ageText(shown.ageSeconds)}`;
  }

  return (
    <div
      className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col"
      data-testid="camera-preview"
      data-state={stale ? "stale" : shown.phase}
    >
      <div className="relative aspect-video bg-slate-200 dark:bg-slate-950 overflow-hidden">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- object URL of an authenticated fetch; next/image cannot load it
          <img
            src={imageUrl}
            alt={`Camera preview for ${cameraId}`}
            className={`absolute inset-0 h-full w-full object-contain ${stale || shown.phase === "error" ? "opacity-40 grayscale" : ""}`}
          />
        )}

        <div className="absolute top-2 left-2 z-10 rounded bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
          Camera preview
        </div>
        <div className="absolute top-2 right-2 z-10">
          <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-widest ${badge.cls}`} data-testid="camera-preview-badge">
            {badge.text}
          </span>
        </div>

        {!imageUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
            {!signedIn ? (
              <>
                <LogIn size={22} className="text-slate-400" />
                <p className="text-xs text-slate-500">Sign in to see the camera preview</p>
              </>
            ) : shown.phase === "loading" ? (
              <>
                <Loader size={22} className="animate-spin text-slate-400" />
                <p className="text-xs text-slate-500">Loading camera preview…</p>
              </>
            ) : shown.phase === "waiting" ? (
              <>
                <CameraOff size={22} className="text-slate-400" />
                <p className="text-xs font-medium text-slate-500">Waiting for the first frame</p>
                <p className="text-[11px] text-slate-400">Start the vision worker for {cameraId} with [preview] enabled = true</p>
              </>
            ) : shown.phase === "error" ? (
              <>
                <AlertCircle size={22} className="text-red-500" />
                <p className="text-xs text-slate-500 max-w-xs break-words">{shown.error.message}</p>
              </>
            ) : null}
          </div>
        )}

        {imageUrl && (stale || shown.phase === "error") && (
          <div className="absolute inset-x-0 bottom-0 z-10 bg-black/60 px-3 py-1.5 text-center text-[11px] font-medium text-white" data-testid="camera-preview-warning">
            {shown.phase === "error"
              ? `Preview unavailable: ${shown.error.message}`
              : `Stale: last frame ${ageText(shown.phase === "frame" ? shown.ageSeconds : 0)}. Is the worker running?`}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-t border-slate-100 dark:border-slate-800/60">
        <p className="text-xs font-bold text-slate-800 dark:text-white leading-none" data-testid="camera-preview-id">{cameraId}</p>
        <span className="text-[10px] text-slate-500 truncate">{footer || "Refreshes about every second"}</span>
      </div>
    </div>
  );
}
