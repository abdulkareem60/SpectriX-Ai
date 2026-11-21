"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { Incident, IncidentStatus } from "@/types/incident";
import { ApiError, listIncidents } from "./api";

export type IncidentsState =
  | { phase: "loading" }
  | { phase: "config-error"; problems: string[] }
  | { phase: "signed-out" }
  | { phase: "error"; error: ApiError }
  | { phase: "ready"; items: Incident[]; nextCursor: string | null; loadedAt: Date };

interface Options {
  limit: number;
  status?: IncidentStatus;
  /** Re-fetch the first page this often while the page is open. 0 = never. */
  refreshMs?: number;
}

/**
 * Loads incidents for the signed-in operator. A failed request always ends in the "error" phase:
 * stale items are dropped rather than shown as if they were current.
 */
export function useIncidents({ limit, status, refreshMs = 0 }: Options) {
  const { state: auth, getToken } = useAuth();
  const [state, setState] = useState<IncidentsState>({ phase: "loading" });
  const [loadingMore, setLoadingMore] = useState(false);
  const requestId = useRef(0);

  const toError = (err: unknown): ApiError =>
    err instanceof ApiError ? err : new ApiError("server", err instanceof Error ? err.message : "Unknown error.");

  const load = useCallback(
    async (showSpinner: boolean) => {
      const id = ++requestId.current;
      if (showSpinner) setState({ phase: "loading" });
      try {
        const token = await getToken();
        const page = await listIncidents(token, { limit, status });
        if (id === requestId.current) {
          setState({ phase: "ready", items: page.items, nextCursor: page.next_cursor, loadedAt: new Date() });
        }
      } catch (err) {
        if (id === requestId.current) setState({ phase: "error", error: toError(err) });
      }
    },
    [getToken, limit, status],
  );

  const authKey =
    auth.status === "signed-in" ? `in:${auth.user.uid}` : auth.status === "config-error" ? "config" : auth.status;

  useEffect(() => {
    if (auth.status !== "signed-in") return;
    queueMicrotask(() => void load(true));
    if (!refreshMs) return;
    const timer = setInterval(() => void load(false), refreshMs);
    return () => clearInterval(timer);
    // authKey changes on sign-in/out or a different user; `auth` itself changes on every token refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authKey, load, refreshMs]);

  const loadMore = useCallback(async () => {
    if (state.phase !== "ready" || !state.nextCursor) return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const token = await getToken();
      const page = await listIncidents(token, { limit, status, cursor: state.nextCursor });
      if (id === requestId.current) {
        setState({ phase: "ready", items: [...state.items, ...page.items], nextCursor: page.next_cursor, loadedAt: new Date() });
      }
    } catch (err) {
      if (id === requestId.current) setState({ phase: "error", error: toError(err) });
    } finally {
      setLoadingMore(false);
    }
  }, [getToken, limit, state, status]);

  // Auth decides the phase until a signed-in request has been made.
  let view: IncidentsState = state;
  if (auth.status === "loading") view = { phase: "loading" };
  else if (auth.status === "config-error") view = { phase: "config-error", problems: auth.problems };
  else if (auth.status === "signed-out") view = { phase: "signed-out" };

  return { state: view, reload: () => load(true), loadMore, loadingMore };
}
