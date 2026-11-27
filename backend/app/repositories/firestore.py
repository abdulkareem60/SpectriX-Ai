"""Cloud Firestore storage (works against the Firestore emulator when FIRESTORE_EMULATOR_HOST is set).

Layout:
  incidents/{incident_id}                   incident metadata and evidence references only
  incidents/{incident_id}/events/{event_id} one small record per accepted worker event (for duplicate detection)
"""

import os
from datetime import datetime
from typing import Any

from google.api_core.exceptions import NotFound
from google.auth.credentials import AnonymousCredentials
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter

from ..schemas.incidents import Incident, IncidentFilters
from ..schemas.zones import ZoneV1
from .base import ApplyEvent, IngestOutcome, InvalidCursor, Mutate, SaveOutcome, VersionConflict, zone_document, zone_from_document

INCIDENTS = "incidents"
EVENTS = "events"


def make_client(project_id: str) -> firestore.Client:
    if os.environ.get("FIRESTORE_EMULATOR_HOST"):
        # The emulator accepts any credentials; avoid needing a service account locally.
        return firestore.Client(project=project_id, credentials=AnonymousCredentials())
    # Production: Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS or the host's identity).
    return firestore.Client(project=project_id)


def _to_doc(incident: Incident) -> dict[str, Any]:
    return incident.model_dump(mode="python", exclude={"id"})


def _from_snap(snap: firestore.DocumentSnapshot) -> Incident:
    return Incident(id=snap.id, **(snap.to_dict() or {}))


class FirestoreIncidentRepository:
    def __init__(self, client: firestore.Client) -> None:
        self._db = client
        self._col = client.collection(INCIDENTS)

    def ingest(self, incident_id: str, event_id: str, event_record: dict[str, Any], apply: ApplyEvent) -> tuple[Incident, IngestOutcome]:
        inc_ref = self._col.document(incident_id)
        ev_ref = inc_ref.collection(EVENTS).document(event_id)

        @firestore.transactional
        def run(txn: firestore.Transaction) -> tuple[Incident, IngestOutcome]:
            inc_snap = inc_ref.get(transaction=txn)
            ev_snap = ev_ref.get(transaction=txn)
            existing = _from_snap(inc_snap) if inc_snap.exists else None
            if existing is not None and ev_snap.exists:
                return existing, "duplicate"
            updated = apply(existing)
            txn.set(inc_ref, _to_doc(updated))
            txn.set(ev_ref, event_record)
            return updated, ("created" if existing is None else "merged")

        return run(self._db.transaction())

    def get(self, incident_id: str) -> Incident | None:
        snap = self._col.document(incident_id).get()
        return _from_snap(snap) if snap.exists else None

    def list(self, filters: IncidentFilters, limit: int, cursor: str | None) -> tuple[list[Incident], str | None]:
        q: Any = self._col
        if filters.status:
            q = q.where(filter=FieldFilter("status", "==", filters.status))
        if filters.camera_id:
            q = q.where(filter=FieldFilter("camera_id", "==", filters.camera_id))
        if filters.event_type:
            q = q.where(filter=FieldFilter("event_type", "==", filters.event_type))
        if filters.occurred_from:
            q = q.where(filter=FieldFilter("occurred_at", ">=", filters.occurred_from))
        if filters.occurred_to:
            q = q.where(filter=FieldFilter("occurred_at", "<=", filters.occurred_to))
        q = q.order_by("occurred_at", direction=firestore.Query.DESCENDING).order_by("__name__", direction=firestore.Query.DESCENDING)
        if cursor is not None:
            cur = self._col.document(cursor).get()
            if not cur.exists:
                raise InvalidCursor(cursor)
            q = q.start_after(cur)
        snaps = list(q.limit(limit + 1).stream())
        items = [_from_snap(s) for s in snaps[:limit]]
        return items, (items[-1].id if len(snaps) > limit and items else None)

    def update(self, incident_id: str, mutate: Mutate) -> Incident | None:
        ref = self._col.document(incident_id)

        @firestore.transactional
        def run(txn: firestore.Transaction) -> Incident | None:
            snap = ref.get(transaction=txn)
            if not snap.exists:
                return None
            updated = mutate(_from_snap(snap))
            txn.set(ref, _to_doc(updated))
            return updated

        try:
            return run(self._db.transaction())
        except NotFound:
            return None

    def ping(self) -> None:
        # Cheap read; raises if the database or emulator is unreachable.
        next(iter(self._col.limit(1).stream()), None)


# ---------------------------------------------------------------- zones
CAMERAS = "cameras"
ZONES = "zones"
VERSIONS = "versions"


class FirestoreZoneRepository:
    """Zones in Firestore.

    Layout:
      cameras/{camera_id}/zones/{zone_id}                      the current version
      cameras/{camera_id}/zones/{zone_id}/versions/{version}   immutable copy of every saved version
    """

    def __init__(self, client: firestore.Client) -> None:
        self._db = client

    def _zone_ref(self, camera_id: str, zone_id: str):
        return self._db.collection(CAMERAS).document(camera_id).collection(ZONES).document(zone_id)

    def save(self, zone: ZoneV1, saved_by: str, saved_at: datetime) -> SaveOutcome:
        cur_ref = self._zone_ref(zone.camera_id, zone.zone_id)
        ver_ref = cur_ref.collection(VERSIONS).document(str(zone.version))

        @firestore.transactional
        def run(txn: firestore.Transaction) -> SaveOutcome:
            cur = cur_ref.get(transaction=txn)
            ver = ver_ref.get(transaction=txn)
            stored = int((cur.to_dict() or {}).get("version", 0)) if cur.exists else 0
            if zone.version != stored + 1 or ver.exists:
                raise VersionConflict(stored)
            doc = zone_document(zone, saved_by, saved_at)
            txn.set(cur_ref, doc)
            txn.create(ver_ref, doc)  # create() fails if the version document already exists: versions are never overwritten
            return "created" if stored == 0 else "updated"

        return run(self._db.transaction())

    def get(self, camera_id: str, zone_id: str) -> ZoneV1 | None:
        snap = self._zone_ref(camera_id, zone_id).get()
        return zone_from_document(snap.to_dict()) if snap.exists else None

    def get_version(self, camera_id: str, zone_id: str, version: int) -> ZoneV1 | None:
        snap = self._zone_ref(camera_id, zone_id).collection(VERSIONS).document(str(version)).get()
        return zone_from_document(snap.to_dict()) if snap.exists else None

    def list_current(self, camera_id: str) -> list[ZoneV1]:
        # Only the current documents: version copies live one level deeper, in each zone's `versions` subcollection.
        snaps = self._db.collection(CAMERAS).document(camera_id).collection(ZONES).stream()
        return sorted((zone_from_document(s.to_dict()) for s in snaps), key=lambda z: z.zone_id)
