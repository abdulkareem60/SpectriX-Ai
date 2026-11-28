import type { ApiErrorBody, IncidentList, IncidentStatus } from "@/types/incident";
import { API_BASE_URL } from "./config";

/**
 * Why a request failed. The UI shows a different message for each, and never treats a failure as success.
 * - config: NEXT_PUBLIC_API_BASE_URL is not set
 * - network: the API could not be reached (stopped, wrong URL, or blocked by CORS)
 * - unauthenticated: 401, the user must sign in (again)
 * - forbidden: 403, signed in but the account's role is not allowed
 * - server: any other error status from the API
 * - bad_response: the API answered 2xx with something that is not the expected shape
 */
export type ApiErrorKind = "config" | "network" | "unauthenticated" | "forbidden" | "server" | "bad_response";

export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    message: string,
    public readonly status?: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  const err = (value as ApiErrorBody | null)?.error;
  return typeof err?.code === "string" && typeof err?.message === "string";
}

type RequestInit_ = { token?: string; signal?: AbortSignal; accept?: string };

/** Sends a GET to the API. Throws ApiError("config" | "network"); HTTP errors are left to the caller. */
async function send(path: string, init: RequestInit_ = {}): Promise<Response> {
  if (!API_BASE_URL) {
    throw new ApiError("config", "The API address is not configured. Set NEXT_PUBLIC_API_BASE_URL in frontend/.env.local.");
  }
  const headers: Record<string, string> = { Accept: init.accept ?? "application/json" };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  try {
    return await fetch(`${API_BASE_URL}${path}`, { headers, cache: "no-store", signal: init.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(
      "network",
      `Cannot reach the API at ${API_BASE_URL}. Check that it is running and that CORS_ORIGINS allows this site.`,
    );
  }
}

/** Maps a non-2xx response (with its parsed body, if any) to an ApiError. */
function errorFrom(res: Response, body: unknown): ApiError {
  const code = isErrorBody(body) ? body.error.code : undefined;
  const message = isErrorBody(body) ? body.error.message : `The API returned HTTP ${res.status}.`;
  if (res.status === 401) return new ApiError("unauthenticated", message, 401, code);
  if (res.status === 403) return new ApiError("forbidden", message, 403, code);
  return new ApiError("server", message, res.status, code);
}

async function request(path: string, init: RequestInit_ = {}): Promise<unknown> {
  const res = await send(path, init);
  const body: unknown = await res.json().catch(() => undefined);
  if (!res.ok) throw errorFrom(res, body);
  if (body === undefined) throw new ApiError("bad_response", "The API returned a response that is not JSON.", res.status);
  return body;
}

export type HealthResult = { ok: true } | { ok: false; error: ApiError };

/** GET /health (no sign-in). ok only when the API answers 200 and its storage check passes. */
export async function checkHealth(signal?: AbortSignal): Promise<HealthResult> {
  try {
    const body = (await request("/health", { signal })) as { status?: unknown } | null;
    if (body?.status !== "ok") return { ok: false, error: new ApiError("bad_response", "Unexpected health response.") };
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err };
    throw err;
  }
}

export interface IncidentQuery {
  status?: IncidentStatus;
  camera_id?: string;
  limit?: number; // 1–100, API default 25
  cursor?: string | null;
}

/** GET /v1/incidents (operator ID token required). Newest first, paged with next_cursor. */
export async function listIncidents(token: string, query: IncidentQuery = {}, signal?: AbortSignal): Promise<IncidentList> {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.camera_id) params.set("camera_id", query.camera_id);
  if (query.limit) params.set("limit", String(query.limit));
  if (query.cursor) params.set("cursor", query.cursor);
  const qs = params.toString();

  const body = (await request(`/v1/incidents${qs ? `?${qs}` : ""}`, { token, signal })) as Partial<IncidentList> | null;
  if (!body || !Array.isArray(body.items)) {
    throw new ApiError("bad_response", "The incident list from the API is not in the expected {items, next_cursor} shape.");
  }
  return { items: body.items, next_cursor: typeof body.next_cursor === "string" ? body.next_cursor : null };
}

export type CameraPreviewResult =
  | { kind: "waiting" }
  | { kind: "frame"; image: Blob; ageSeconds: number; capturedAt: string | null; cameraId: string };

/**
 * GET /v1/cameras/{id}/preview (operator ID token required): the latest preview JPEG the worker sent.
 * "waiting" means no frame has arrived yet. ageSeconds is measured by the API's clock, so staleness does
 * not depend on this computer's clock. The browser only ever gets JPEG frames, never a camera URL.
 */
export async function fetchCameraPreview(token: string, cameraId: string, signal?: AbortSignal): Promise<CameraPreviewResult> {
  const res = await send(`/v1/cameras/${encodeURIComponent(cameraId)}/preview`, { token, signal, accept: "image/jpeg" });
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => undefined);
    if (res.status === 404 && isErrorBody(body) && body.error.code === "preview_not_available") return { kind: "waiting" };
    throw errorFrom(res, body);
  }
  const age = Number(res.headers.get("X-Preview-Age-Seconds"));
  if (!res.headers.get("Content-Type")?.startsWith("image/jpeg") || !Number.isFinite(age)) {
    throw new ApiError("bad_response", "The camera preview from the API is not a JPEG with an age header.");
  }
  return {
    kind: "frame",
    image: await res.blob(),
    ageSeconds: age,
    capturedAt: res.headers.get("X-Captured-At"),
    cameraId: res.headers.get("X-Camera-Id") ?? cameraId,
  };
}

/** Formats a UTC timestamp in Asia/Karachi (PKT). */
export function formatPKT(utcString: string): string {
  const date = new Date(utcString);
  if (isNaN(date.getTime())) return "Invalid date";
  return (
    date.toLocaleString("en-PK", {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }) + " PKT"
  );
}
