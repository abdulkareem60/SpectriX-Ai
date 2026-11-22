"""In-process storage for tests and quick experiments. Data is lost when the process stops."""

import threading
from datetime import datetime
from typing import Any

from ..schemas.incidents import Incident, IncidentFilters
from ..schemas.zones import ZoneV1
from .base import ApplyEvent, IngestOutcome, InvalidCursor, Mutate, SaveOutcome, VersionConflict, zone_document, zone_from_document


def _matches(i: Incident, f: IncidentFilters) -> bool:
    return (
        (f.status is None or i.status == f.status)
        and (f.camera_id is None or i.camera_id == f.camera_id)
        and (f.event_type is None or i.event_type == f.event_type)
        and (f.occurred_from is None or i.occurred_at >= f.occurred_from)
        and (f.occurred_to is None or i.occurred_at <= f.occurred_to)
    )


class MemoryIncidentRepository:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._incidents: dict[str, Incident] = {}
        self._events: dict[str, dict[str, dict[str, Any]]] = {}

    def ingest(self, incident_id: str, event_id: str, event_record: dict[str, Any], apply: ApplyEvent) -> tuple[Incident, IngestOutcome]:
        with self._lock:
            existing = self._incidents.get(incident_id)
            seen = self._events.setdefault(incident_id, {})
            if existing is not None and event_id in seen:
                return existing, "duplicate"
            updated = apply(existing)
            self._incidents[incident_id] = updated
            seen[event_id] = dict(event_record)
            return updated, ("created" if existing is None else "merged")

    def get(self, incident_id: str) -> Incident | None:
        with self._lock:
            return self._incidents.get(incident_id)

    def list(self, filters: IncidentFilters, limit: int, cursor: str | None) -> tuple[list[Incident], str | None]:
        with self._lock:
            rows = sorted((i for i in self._incidents.values() if _matches(i, filters)), key=lambda i: (i.occurred_at, i.id), reverse=True)
        start = 0
        if cursor is not None:
            ids = [i.id for i in rows]
            if cursor not in ids:
                raise InvalidCursor(cursor)
            start = ids.index(cursor) + 1
        page = rows[start : start + limit]
        has_more = len(rows) > start + limit
        return page, (page[-1].id if has_more and page else None)

    def update(self, incident_id: str, mutate: Mutate) -> Incident | None:
        with self._lock:
            current = self._incidents.get(incident_id)
            if current is None:
                return None
            updated = mutate(current)
            self._incidents[incident_id] = updated
            return updated

    def ping(self) -> None:
        return None


class MemoryZoneRepository:
    """In-process zone storage for tests and quick experiments. Same rules as the Firestore version."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._current: dict[tuple[str, str], dict[str, Any]] = {}
        self._versions: dict[tuple[str, str, int], dict[str, Any]] = {}

    def save(self, zone: ZoneV1, saved_by: str, saved_at: datetime) -> SaveOutcome:
        key = (zone.camera_id, zone.zone_id)
        with self._lock:
            current = self._current.get(key)
            stored = current["version"] if current else 0
            if zone.version != stored + 1 or (*key, zone.version) in self._versions:
                raise VersionConflict(stored)
            doc = zone_document(zone, saved_by, saved_at)
            self._current[key] = doc
            self._versions[(*key, zone.version)] = dict(doc)
            return "created" if stored == 0 else "updated"

    def get(self, camera_id: str, zone_id: str) -> ZoneV1 | None:
        with self._lock:
            doc = self._current.get((camera_id, zone_id))
        return zone_from_document(doc) if doc else None

    def get_version(self, camera_id: str, zone_id: str, version: int) -> ZoneV1 | None:
        with self._lock:
            doc = self._versions.get((camera_id, zone_id, version))
        return zone_from_document(doc) if doc else None

    def list_current(self, camera_id: str) -> list[ZoneV1]:
        with self._lock:
            docs = [d for (cam, _), d in sorted(self._current.items()) if cam == camera_id]
        return [zone_from_document(d) for d in docs]

