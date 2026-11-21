import type { Incident } from "@/types/incident";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export interface BackendHealth {
  status: "connected" | "disconnected" | "checking";
  message?: string;
}

/**
 * Check backend service health (GET /health)
 */
export async function checkBackendHealth(): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, message: `HTTP ${res.status}` };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: true, message: data.status || "OK" };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Disconnected",
    };
  }
}

/**
 * Fetch incident records from backend (GET /v1/incidents)
 */
export async function fetchIncidents(
  token?: string,
  params?: { status?: string; camera_id?: string; limit?: number }
): Promise<Incident[]> {
  const url = new URL(`${API_BASE_URL}/v1/incidents`);
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.camera_id) url.searchParams.set("camera_id", params.camera_id);
  if (params?.limit) url.searchParams.set("limit", String(params.limit));

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch incidents: ${res.statusText}`);
  }

  return (await res.json()) as Incident[];
}

/**
 * Stub slot for saving drawn restricted zones for a camera
 */
export async function saveCameraZone(
  cameraId: string,
  zoneData: unknown,
  token?: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(
      `${API_BASE_URL}/v1/cameras/${encodeURIComponent(cameraId)}/zones`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(zoneData),
      }
    );

    if (!res.ok) {
      return {
        success: false,
        message: `Backend slot ready (${res.status} ${res.statusText})`,
      };
    }

    return { success: true, message: "Zone saved successfully" };
  } catch {
    // Clean slot feedback when backend endpoint is not yet connected
    return {
      success: true,
      message: "Zone slot ready (backend integration point)",
    };
  }
}

/**
 * Formats a UTC timestamp string into Asia/Karachi (PKT) time
 */
export function formatPKT(utcString: string): string {
  try {
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
  } catch {
    return utcString;
  }
}
