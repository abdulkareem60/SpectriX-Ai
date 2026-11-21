// ─────────────────────────────────────────────────────────────────────────────
//  Contract Types — mirrors contracts/examples/incident.v1.json exactly
// ─────────────────────────────────────────────────────────────────────────────

export type IncidentStatus = "open" | "acknowledged" | "resolved";
export type ReviewOutcome = "unreviewed" | "confirmed" | "false_positive";
export type EvidenceKind = "snapshot" | "clip";

export interface Evidence {
  kind: EvidenceKind;
  uri: string;
  captured_at?: string; // RFC 3339
}

export interface Incident {
  id: string;
  event_type: "restricted_zone_entry";
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
  acknowledged_at?: string;
  acknowledged_by?: string;
  acknowledgement_note?: string;
}
