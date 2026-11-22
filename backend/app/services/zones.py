"""Zone rules: one current version per camera zone, every saved version kept, no silent overwrites."""

from collections.abc import Callable
from datetime import UTC, datetime

from ..errors import ApiError
from ..repositories.base import SaveOutcome, VersionConflict, ZoneRepository
from ..schemas.zones import ZoneV1


def utcnow() -> datetime:
    return datetime.now(UTC)


class ZoneService:
    def __init__(self, repo: ZoneRepository, clock: Callable[[], datetime] = utcnow) -> None:
        self._repo = repo
        self._clock = clock

    def save(self, camera_id: str, zone_id: str, zone: ZoneV1, saved_by: str) -> SaveOutcome:
        if (zone.camera_id, zone.zone_id) != (camera_id, zone_id):
            raise ApiError(422, "path_body_mismatch", "camera_id and zone_id in the body must match the URL.",
                           details={"url": {"camera_id": camera_id, "zone_id": zone_id},
                                    "body": {"camera_id": zone.camera_id, "zone_id": zone.zone_id}})
        try:
            return self._repo.save(zone, saved_by, self._clock())
        except VersionConflict as c:
            expected = c.current + 1
            raise ApiError(409, "version_conflict",
                           f"Zone version {zone.version} cannot be saved; the next version must be {expected}. "
                           "Reload the zone and apply your change again.",
                           details={"current_version": c.current, "expected_version": expected}) from None

    def list_for_worker(self, camera_id: str) -> list[ZoneV1]:
        return self._repo.list_current(camera_id)

    def get(self, camera_id: str, zone_id: str) -> ZoneV1:
        zone = self._repo.get(camera_id, zone_id)
        if zone is None:
            raise ApiError(404, "zone_not_found", "Zone not found.")
        return zone
