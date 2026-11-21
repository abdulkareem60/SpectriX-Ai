// Contract types for the incident endpoints.
// Source of truth: backend/app/schemas/incidents.py and contracts/examples/incident.v1.json.
// Keep these in step with the backend: drift shows up as wrong labels, not as errors.

export type IncidentStatus = "new" | "acknowledged";
export type ReviewOutcome = "unreviewed" | "confirmed" | "false_alert" | "uncertain";
export type EvidenceKind = "snapshot" | "clip";
export type EventType = "restricted_zone_entry";

export interface Evidence {
  kind: EvidenceKind;
  uri: string; // storage reference, not a viewable URL
  captured_at?: string | null; // RFC 3339
}

export interface Incident {
  id: string;
  event_type: EventType;
  camera_id: string;
  zone_id: string;
  track_id: number;
  status: IncidentStatus;
  review_outcome: ReviewOutcome;
  detection_score: number;
  occurred_at: string; // RFC 3339 UTC
  last_event_at: string; // RFC 3339 UTC
  event_count: number;
  first_event_id: string; // UUID
  evidence: Evidence[];
  created_at: string; // RFC 3339 UTC
  updated_at: string; // RFC 3339 UTC
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  acknowledgement_note?: string | null;
}

/** GET /v1/incidents response: newest first; pass next_cursor back as `cursor` for the next page. */
export interface IncidentList {
  items: Incident[];
  next_cursor: string | null;
}

/** Every API error uses this shape. */
export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
