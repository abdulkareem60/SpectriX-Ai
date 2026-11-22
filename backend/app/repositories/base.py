"""Storage interfaces for incidents and zones. Services depend on these, not on Firestore directly."""

from collections.abc import Callable
from datetime import datetime
from typing import Any, Literal, Protocol

from ..schemas.incidents import Incident, IncidentFilters
from ..schemas.zones import ZoneV1

IngestOutcome = Literal["created", "merged", "duplicate"]

# Receives the stored incident (or None if new) and returns the incident to store.
ApplyEvent = Callable[[Incident | None], Incident]
# Receives the stored incident and returns the updated one.
Mutate = Callable[[Incident], Incident]


class InvalidCursor(Exception):
    pass


class IncidentRepository(Protocol):
    def ingest(self, incident_id: str, event_id: str, event_record: dict[str, Any], apply: ApplyEvent) -> tuple[Incident, IngestOutcome]:
        """Atomically record an event and create or update its incident.

        If event_id was already recorded for this incident, nothing is written and
        the outcome is "duplicate".
        """
        ...

    def get(self, incident_id: str) -> Incident | None: ...

    def list(self, filters: IncidentFilters, limit: int, cursor: str | None) -> tuple[list[Incident], str | None]:
        """Newest first (occurred_at, then id). cursor is the id of the last item of the previous page."""
        ...

    def update(self, incident_id: str, mutate: Mutate) -> Incident | None:
        """Atomically apply mutate to an incident. Returns None if it does not exist."""
        ...

    def ping(self) -> None:
        """Raise if storage is unreachable."""
        ...


# ---------------------------------------------------------------- zones
SaveOutcome = Literal["created", "updated"]


class VersionConflict(Exception):
    """The saved version is not the next one. `current` is the stored version (0 = zone does not exist)."""

    def __init__(self, current: int) -> None:
        super().__init__(f"current version is {current}")
        self.current = current


class ZoneRepository(Protocol):
    def save(self, zone: ZoneV1, saved_by: str, saved_at: datetime) -> SaveOutcome:
        """Atomically store `zone` as the current zone AND as an immutable copy of its version.

        zone.version must be 1 for a new zone, or exactly the stored version + 1 for an update;
        otherwise VersionConflict is raised and nothing is written.
        """
        ...

    def get(self, camera_id: str, zone_id: str) -> ZoneV1 | None: ...

    def get_version(self, camera_id: str, zone_id: str, version: int) -> ZoneV1 | None:
        """An earlier saved version, exactly as it was saved (used later for historical incidents)."""
        ...

    def list_current(self, camera_id: str) -> list[ZoneV1]:
        """The current version of every zone on a camera (enabled or not), sorted by zone_id."""
        ...


# Stored alongside the zone; not part of the zone contract.
ZONE_META_FIELDS = ("saved_by", "saved_at")


def zone_document(zone: ZoneV1, saved_by: str, saved_at: datetime) -> dict[str, Any]:
    """The zone in its JSON form (points and captured_at come back exactly as saved) plus who saved it and when."""
    return {**zone.model_dump(mode="json"), "saved_by": saved_by, "saved_at": saved_at}


def zone_from_document(doc: dict[str, Any]) -> ZoneV1:
    return ZoneV1.model_validate({k: v for k, v in doc.items() if k not in ZONE_META_FIELDS})
