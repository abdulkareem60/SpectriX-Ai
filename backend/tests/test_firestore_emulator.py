"""Same core flows against the Firestore emulator. Skipped unless FIRESTORE_EMULATOR_HOST is set.

Run: firebase emulators:exec --only firestore "python -m pytest -m emulator" (from the repo root, see README).
"""

import os
import uuid

import pytest

from app.schemas.events import VisionEventV1
from app.schemas.incidents import IncidentFilters
from app.services.incidents import IncidentService

from .conftest import make_event

pytestmark = [
    pytest.mark.emulator,
    pytest.mark.skipif(not os.environ.get("FIRESTORE_EMULATOR_HOST"), reason="Firestore emulator not running"),
]


@pytest.fixture
def service() -> IncidentService:
    from app.repositories.firestore import FirestoreIncidentRepository, make_client

    # A unique project ID isolates each run's data inside the emulator.
    client = make_client(f"demo-nigahsense-test-{uuid.uuid4().hex[:8]}")
    return IncidentService(FirestoreIncidentRepository(client))


def _event(**kw) -> VisionEventV1:
    return VisionEventV1.model_validate(make_event(**kw))


def test_firestore_create_duplicate_merge(service: IncidentService) -> None:
    ev = _event()
    assert service.ingest(ev).outcome == "created"
    assert service.ingest(ev).outcome == "duplicate"
    merged = service.ingest(_event(detection_score=0.95))
    assert merged.outcome == "merged"
    inc = service.get(merged.incident_id)
    assert inc.event_count == 2 and inc.detection_score == 0.95
    assert inc.evidence[0].uri.startswith("evidence/")


def test_firestore_list_filter_paginate_and_acknowledge(service: IncidentService) -> None:
    ids = []
    for i in range(3):
        ids.append(service.ingest(_event(track_id=i, idempotency_key=f"cam-stockroom-01:zone-high-bay:s9:{i}:restricted_zone_entry",
                                         occurred_at=f"2026-11-07T14:20:0{i}+05:00")).incident_id)
    page1 = service.list(IncidentFilters(), 2, None)
    page2 = service.list(IncidentFilters(), 2, page1.next_cursor)
    assert [i.id for i in page1.items + page2.items] == list(reversed(ids))
    assert page2.next_cursor is None

    acked = service.acknowledge(ids[0], "op-1", "on it")
    assert acked.status == "acknowledged" and acked.acknowledged_by == "op-1"
    assert service.acknowledge(ids[0], "op-2", "again").acknowledged_by == "op-1"
    assert [i.id for i in service.list(IncidentFilters(status="acknowledged"), 10, None).items] == [ids[0]]
    assert len(service.list(IncidentFilters(status="new", camera_id="cam-stockroom-01"), 10, None).items) == 2


# ---------------------------------------------------------------- zones
@pytest.fixture
def zones():
    from app.repositories.firestore import FirestoreZoneRepository, make_client
    from app.services.zones import ZoneService

    client = make_client(f"demo-nigahsense-test-{uuid.uuid4().hex[:8]}")
    return ZoneService(FirestoreZoneRepository(client)), FirestoreZoneRepository(client), client


def _zone(**changes):
    from app.schemas.zones import ZoneV1

    from .conftest import load_example

    z = load_example("zone.v1.json")
    z.update(changes)
    return ZoneV1.model_validate(z)


def test_firestore_zone_save_read_update_and_history(zones) -> None:
    service, repo, client = zones
    v1 = _zone()
    assert service.save("cam-demo-plaza", "zone-south-lawn", v1, "sup-1") == "created"
    assert service.get("cam-demo-plaza", "zone-south-lawn") == v1  # same points, same order

    v2 = _zone(version=2, points=[{"x": 0.0, "y": 0.6}, {"x": 0.5, "y": 0.7}, {"x": 0.6, "y": 1.0}, {"x": 0.0, "y": 1.0}])
    assert service.save("cam-demo-plaza", "zone-south-lawn", v2, "sup-2") == "updated"
    assert service.get("cam-demo-plaza", "zone-south-lawn") == v2
    assert repo.get_version("cam-demo-plaza", "zone-south-lawn", 1) == v1
    assert repo.get_version("cam-demo-plaza", "zone-south-lawn", 2) == v2

    # the documents are where the design says, with who saved them and when
    zref = client.collection("cameras").document("cam-demo-plaza").collection("zones").document("zone-south-lawn")
    cur = zref.get().to_dict()
    assert cur["version"] == 2 and cur["saved_by"] == "sup-2" and cur["saved_at"].tzinfo is not None
    assert sorted(d.id for d in zref.collection("versions").stream()) == ["1", "2"]


def test_firestore_zone_rejects_stale_version_and_changes_nothing(zones) -> None:
    from app.errors import ApiError

    service, repo, _ = zones
    service.save("cam-demo-plaza", "zone-south-lawn", _zone(), "sup-1")
    service.save("cam-demo-plaza", "zone-south-lawn", _zone(version=2, name="Edit by A"), "sup-a")
    with pytest.raises(ApiError) as err:  # B edited the old version 1 and also sends version 2
        service.save("cam-demo-plaza", "zone-south-lawn", _zone(version=2, name="Edit by B"), "sup-b")
    assert err.value.status_code == 409 and err.value.details == {"current_version": 2, "expected_version": 3}
    assert service.get("cam-demo-plaza", "zone-south-lawn").name == "Edit by A"
    assert repo.get_version("cam-demo-plaza", "zone-south-lawn", 2).name == "Edit by A"
    with pytest.raises(ApiError):
        service.save("cam-demo-plaza", "zone-new", _zone(zone_id="zone-new", version=2), "sup-1")  # must start at 1
    assert repo.get("cam-demo-plaza", "zone-new") is None


def test_firestore_existing_version_document_is_never_overwritten(zones) -> None:
    from app.errors import ApiError

    service, repo, client = zones
    # simulate a version 1 copy left behind without a current document (e.g. a partially restored backup)
    vref = client.collection("cameras").document("cam-x").collection("zones").document("zone-x").collection("versions").document("1")
    vref.set({"marker": "keep me"})
    with pytest.raises(ApiError) as err:
        service.save("cam-x", "zone-x", _zone(camera_id="cam-x", zone_id="zone-x"), "sup-1")
    assert err.value.status_code == 409
    assert vref.get().to_dict() == {"marker": "keep me"} and repo.get("cam-x", "zone-x") is None


def test_firestore_lists_only_current_zones_of_one_camera(zones) -> None:
    service, repo, _ = zones
    service.save("cam-demo-plaza", "zone-south-lawn", _zone(), "sup-1")
    service.save("cam-demo-plaza", "zone-south-lawn", _zone(version=2, enabled=False), "sup-1")
    service.save("cam-demo-plaza", "zone-a-door", _zone(zone_id="zone-a-door"), "sup-1")
    service.save("cam-other", "zone-south-lawn", _zone(camera_id="cam-other"), "sup-1")
    listed = service.list_for_worker("cam-demo-plaza")
    assert [(z.zone_id, z.version, z.enabled) for z in listed] == [("zone-a-door", 1, True), ("zone-south-lawn", 2, False)]
    assert service.list_for_worker("cam-none") == []
