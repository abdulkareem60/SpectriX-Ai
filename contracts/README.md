# Shared contracts

These files are the agreed interface between the vision worker, the backend API and the frontend. Change them only through a reviewed pull request approved by the backend lead (Abdul Kareem) and the affected owner. A breaking change gets a new versioned file (`v2`); `v1` is never edited in a breaking way.

| File | Used by | Purpose |
|---|---|---|
| [`vision-event.v1.schema.json`](vision-event.v1.schema.json) | Vision worker → API | JSON Schema for one event sent to `POST /v1/events` |
| [`examples/vision-event.v1.restricted-zone-entry.json`](examples/vision-event.v1.restricted-zone-entry.json) | Worker, tests | Realistic valid event |
| [`examples/incident.v1.json`](examples/incident.v1.json) | Frontend | Shape of one incident returned by the incident endpoints |
| [`zone.v1.schema.json`](zone.v1.schema.json) | Zone editor ↔ API ↔ worker | JSON Schema for one restricted zone drawn on a camera's reference frame |
| [`examples/zone.v1.json`](examples/zone.v1.json) | Frontend mock data, tests | Valid zone: the sample video's south-lawn zone |
| [`examples/zone.v1.invalid-cases.json`](examples/zone.v1.invalid-cases.json) | Tests, frontend error handling | Invalid zones, each labelled with the layer that rejects it |

The backend tests validate every example against the API's models, so the examples cannot silently drift from the code.

## Vision event v1

Only `restricted_zone_entry` exists in v1. All fields except `evidence` are required. Unknown fields are rejected, to catch typos early.

| Field | Type | Rule |
|---|---|---|
| `schema_version` | string | Always `"1.0"` |
| `event_id` | UUID string | New for each message; **reuse it when retrying** the same message |
| `idempotency_key` | string, 8–200 chars, `[A-Za-z0-9:._-]` | Same value for every event about the same occurrence. Recommended: `<camera_id>:<zone_id>:<session_id>:<track_id>:<event_type>` |
| `event_type` | enum | `restricted_zone_entry` |
| `camera_id`, `zone_id` | lowercase id, max 64 chars | Configured identifiers |
| `track_id` | integer ≥ 0 | Tracker ID, valid only within one camera and worker session |
| `occurred_at` | RFC 3339 with offset | Time of the triggering frame. More than 5 minutes in the future is rejected |
| `detection_score` | number 0–1 | Detector confidence, not system accuracy |
| `evidence` | object or null, optional | `{ "kind": "snapshot" \| "clip", "uri": "...", "captured_at"?: "..." }` |

**Evidence is a reference, never bytes.** Upload the snapshot or clip to media storage first, then send its location (`gs://`, `s3://`, `https://` or a relative `evidence/...` path). `data:` URIs are rejected.

### How duplicates are handled

| Situation | API result | Effect |
|---|---|---|
| First event for an `idempotency_key` | `201`, `"outcome": "created"` | New incident |
| Same `event_id` sent again (network retry) | `200`, `"outcome": "duplicate"` | Nothing changes |
| New `event_id`, same `idempotency_key` (later frame of the same occurrence) | `200`, `"outcome": "merged"` | Same incident: `event_count` +1, `last_event_at`, highest score and new evidence updated |

The worker should send one event when a track **enters** the zone. Sending more frames is safe but adds load, so throttle repeats (for example, at most one per track per few seconds).

## Zone v1

One restricted zone for one camera (or recorded video), drawn on a still frame that the worker captured from **the same stream it analyses**. The API model [`backend/app/schemas/zones.py`](../backend/app/schemas/zones.py) is the authority. It mirrors the schema and adds the polygon checks JSON Schema cannot express. No endpoints use it yet; this is step 1 of the zone editor.

| Field | Type | Rule |
|---|---|---|
| `schema_version` | string | Always `"1.0"` (same convention as the vision event) |
| `camera_id`, `zone_id` | lowercase id, max 64 chars | Same rule as the vision event. `zone_id` never changes once created; rename with `name` |
| `name` | string, 1–80 chars, not blank | Label shown to operators |
| `kind` | enum | `restricted` (only kind in v1) |
| `enabled` | boolean | Disabled zones never alert but are kept, so old incidents still resolve. "Delete" means disable |
| `version` | integer ≥ 1 | Starts at 1, +1 on every saved change |
| `points` | 3–32 objects `{ "x": number, "y": number }` | Polygon corners in drawing order, either direction |
| `reference_frame` | `{ "width", "height", "captured_at" }` | Size in pixels (1–16384) of the frame the zone was drawn on, and when it was captured (RFC 3339 with offset) |

**Coordinates**
- `x` and `y` are fractions of the **full analysis frame**, from 0 to 1.
- The origin is the **top-left** corner; **x increases to the right** and **y increases downwards**.
- This matches the worker's TOML zones and its feet-point test, which uses the bottom centre of a person's box.
- The polygon **closes automatically**. Don't repeat the first point; that counts as a duplicate vertex.
- Points are objects, not `[x, y]` pairs, so the list can be stored directly in Firestore, which doesn't allow arrays inside arrays.

**Converting for the browser.** Fractions survive resizing, but the editor must convert relative to the **displayed image area itself**, not a letterboxed container:
- pixel x = `x × width`;
- pixel y = `y × height`.

**Validation layers**

| Rule | JSON Schema | API model |
|---|---|---|
| Required fields, no unknown fields, ID format, `kind`, `version ≥ 1`, frame size ≥ 1, 3–32 points, each `x`/`y` within 0–1, numbers not text | ✓ | ✓ |
| `captured_at` has a timezone offset | ✓ (by `pattern`; `format: date-time` alone is ignored by many validators unless a format plugin is installed) | ✓ |
| Exact duplicate point | ✓ (`uniqueItems`) | ✓ |
| Finite numbers | ✗ (NaN passes range checks; JSON text cannot carry NaN, but programs can) | ✓ |
| Near-duplicate points (closer than `1e-6`, far below a pixel) | ✗ | ✓ |
| All points on one line | ✗ | ✓ |
| Edges cross, touch, or fold back on each other (must be a simple polygon) | ✗ | ✓ |
| Area at least **0.001 of the frame** (0.1 %, about 21 × 21 px on 768 × 576; smaller shapes are almost always mis-clicks and too small to alert reliably) | ✗ | ✓ |

The limits are also listed in the schema under `x-nigahsense-polygon-rules`, and a test keeps them equal to the model's constants. Every invalid example in [`examples/zone.v1.invalid-cases.json`](examples/zone.v1.invalid-cases.json) is labelled with the layer that must reject it.

**From TOML.** A TOML zone `points = [[0.00, 0.50], [0.42, 0.63], …]` becomes `[{"x": 0.0, "y": 0.5}, {"x": 0.42, "y": 0.63}, …]` (`points_from_pairs` in the API model). The worker tests confirm the converted sample zone gives identical inside/outside decisions. The TOML loader and detection are unchanged.

### Zone endpoints

| Request | Who | Result |
|---|---|---|
| `PUT /v1/cameras/{camera_id}/zones/{zone_id}` with a zone v1 body | `supervisor` or `admin` (`ZONE_EDITOR_ROLES`) | `201` on create (`version` 1), `200` on update (`version` = current + 1). Returns the saved zone |
| `GET /v1/cameras/{camera_id}/zones/{zone_id}` | Any operator role | `200` with the current zone, exactly as saved |
| `GET /v1/worker/cameras/{camera_id}/zones` | Vision worker (`X-Worker-Key` only; user tokens are refused) | `200` with `{"camera_id", "zones": [zone v1, …]}`: every current zone, enabled or not, sorted by `zone_id`; `[]` if none |

How saving works:
- **Versions prevent lost edits.** Send `version` 1 to create; to update, send the version you loaded **plus one**. Anything else returns `409 version_conflict` with `details: {"current_version", "expected_version"}`, and nothing is saved. When that happens, the editor should reload the zone and let the operator reapply the change.
- **Every version is kept.** The current zone is at `cameras/{camera_id}/zones/{zone_id}`, and an immutable copy of each version at `…/versions/{version}`. Both are written in one Firestore transaction, and an existing version is never overwritten. Each document also records who saved it and when (`saved_by`, `saved_at`); these fields are not returned in the zone.
- **Errors:**
  - `422 validation_error`: invalid zone, with the same messages as the model;
  - `422 path_body_mismatch`: `camera_id` or `zone_id` in the body differs from the URL;
  - `401`: not signed in;
  - `403`: role not allowed (the worker key cannot change zones);
  - `404 zone_not_found`: no such zone.
- **To disable a zone,** save the next version with `"enabled": false`. There is no delete.

The worker reads zones from the API when its config sets `[camera] zones_source = "api"` (see [worker/README.md](../worker/README.md#zones-from-the-api)). Not built yet: listing zones for the editor, and reference-frame snapshots.

### Decision: zone versions in incidents (later step)

When zones come from the API, each event must record **which zone shape triggered it**. The agreed approach:
1. **The worker sends the zone `version` it actually used** when it produced the event (not the latest version known to the API, which may have changed since).
2. **The backend keeps every saved version's shape**: zone versions are never overwritten, only added. Each incident stores `zone_version` and resolves it to that version's `points`, so historical incidents still show the zone as it was when the alert fired.

This needs a **reviewed contract change**: an optional `zone_version` on the vision event, and the matching field on the incident. Deploy the API first, because v1 events reject unknown fields. Until then the vision event and incident payloads stay exactly as they are; this step does not change them.

## Incident (API response)

See [`examples/incident.v1.json`](examples/incident.v1.json). Key points for the frontend:

- `status` is the lifecycle: `new` → `acknowledged` (resolution comes in a later increment).
- `review_outcome` is separate from status and is `unreviewed` until review endpoints exist. Show detections as *possible* events until an operator confirms them.
- All timestamps are UTC (`Z`). Display them in Asia/Karachi (PKT).
- `evidence[].uri` is a storage reference. The frontend must get a viewable URL from a later evidence endpoint, not read storage directly.

Errors from every endpoint use one shape:

```json
{ "error": { "code": "validation_error", "message": "Request validation failed.", "details": [] } }
```
