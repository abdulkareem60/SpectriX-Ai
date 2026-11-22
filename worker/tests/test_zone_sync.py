"""Zones from the API: loading, change detection, cache fallback, frame-size warning, live swap in the pipeline."""

import json
import logging
import threading
from datetime import UTC, datetime, timedelta

import httpx
import numpy as np
import pytest

from nigah_worker.config import WorkerConfig, load_config
from nigah_worker.detection import TrackedPerson
from nigah_worker.pipeline import run_pipeline
from nigah_worker.rules import RestrictedZoneRule
from nigah_worker.sources import Frame
from nigah_worker.zone_sync import ZoneApiClient, ZoneSync, ZoneSyncError
from nigah_worker.zones import Zone

from .conftest import CONTRACTS

CAM = "cam-demo-plaza"
LEFT = [{"x": 0.0, "y": 0.0}, {"x": 0.5, "y": 0.0}, {"x": 0.5, "y": 1.0}, {"x": 0.0, "y": 1.0}]
RIGHT = [{"x": 0.5, "y": 0.0}, {"x": 1.0, "y": 0.0}, {"x": 1.0, "y": 1.0}, {"x": 0.5, "y": 1.0}]


def api_zone(zone_id="zone-a", version=1, enabled=True, points=LEFT, w=768, h=576) -> dict:
    return {"schema_version": "1.0", "camera_id": CAM, "zone_id": zone_id, "name": zone_id.title(), "kind": "restricted",
            "enabled": enabled, "version": version, "points": points,
            "reference_frame": {"width": w, "height": h, "captured_at": "2026-11-21T10:00:00Z"}}


class FakeApi:
    """Serves whatever `zones` currently holds; `down` simulates an outage; records the worker key it was sent."""

    def __init__(self, zones=None):
        self.zones = zones or []
        self.down = False
        self.status = 200
        self.keys = []

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.keys.append(request.headers.get("X-Worker-Key"))
        if self.down:
            raise httpx.ConnectError("refused")
        if self.status != 200:
            return httpx.Response(self.status, json={"error": {"code": "x", "message": "A valid X-Worker-Key header is required."}})
        cam = request.url.path.split("/")[4]
        return httpx.Response(200, json={"camera_id": cam, "zones": self.zones})


def make(api: FakeApi, tmp_path, camera=CAM) -> ZoneSync:
    client = ZoneApiClient("http://api.test", "worker-secret", transport=httpx.MockTransport(api))
    return ZoneSync(client, camera, tmp_path / "zones-cache.json", poll_seconds=60)


# --- loading -------------------------------------------------------------------------------------------

def test_initial_load_uses_enabled_zones_and_the_worker_key(tmp_path) -> None:
    api = FakeApi([api_zone("zone-a"), api_zone("zone-b", enabled=False, points=RIGHT)])
    zones = make(api, tmp_path).initial()
    assert [z.id for z in zones] == ["zone-a"]
    assert zones[0].points == ((0.0, 0.0), (0.5, 0.0), (0.5, 1.0), (0.0, 1.0))
    assert api.keys == ["worker-secret"]


def test_contract_example_converts_to_the_same_zone_as_the_toml_file(tmp_path) -> None:
    example = json.loads((CONTRACTS / "examples" / "zone.v1.json").read_text(encoding="utf-8"))
    zones = make(FakeApi([example]), tmp_path).initial()
    toml_zone = load_config(CONTRACTS.parent / "worker" / "config" / "worker.example.toml").zones[0]
    assert zones[0].points == tuple(tuple(p) for p in toml_zone.points) and zones[0].id == toml_zone.id


def test_malformed_zone_is_skipped_not_fatal(tmp_path, caplog) -> None:
    bad = api_zone("zone-bad", points=[{"x": 0.1, "y": 0.1}, {"x": 2.0, "y": 0.1}, {"x": 0.1, "y": 0.9}])
    zones = make(FakeApi([bad, api_zone("zone-a")]), tmp_path).initial()
    assert [z.id for z in zones] == ["zone-a"] and "Ignoring malformed zone 'zone-bad'" in caplog.text


def test_no_enabled_zones_starts_but_warns(tmp_path, caplog) -> None:
    caplog.set_level(logging.WARNING)
    assert make(FakeApi([api_zone(enabled=False)]), tmp_path).initial() == []
    assert "nothing will alert" in caplog.text


def test_wrong_worker_key_is_a_clear_error(tmp_path) -> None:
    api = FakeApi([api_zone()])
    api.status = 401
    with pytest.raises(ZoneSyncError, match="HTTP 401"):
        make(api, tmp_path).initial()


def test_empty_worker_key_is_refused() -> None:
    with pytest.raises(ValueError):
        ZoneApiClient("http://api.test", "")


# --- cache ---------------------------------------------------------------------------------------------

def test_api_down_at_start_uses_the_saved_zones(tmp_path, caplog) -> None:
    api = FakeApi([api_zone(version=3)])
    make(api, tmp_path).initial()          # first run saves the cache
    api.down = True
    caplog.set_level(logging.WARNING)
    zones = make(api, tmp_path).initial()  # second run cannot reach the API
    assert [z.id for z in zones] == ["zone-a"] and "saved at" in caplog.text


def test_api_down_and_no_cache_stops_with_a_clear_error(tmp_path) -> None:
    api = FakeApi()
    api.down = True
    with pytest.raises(ZoneSyncError, match="no saved copy"):
        make(api, tmp_path).initial()


def test_cache_for_another_camera_is_not_used(tmp_path) -> None:
    make(FakeApi([api_zone()]), tmp_path).initial()
    api = FakeApi()
    api.down = True
    with pytest.raises(ZoneSyncError):
        make(api, tmp_path, camera="cam-other").initial()


# --- change detection ----------------------------------------------------------------------------------

def test_poll_reports_each_change_once(tmp_path) -> None:
    api = FakeApi([api_zone()])
    sync = make(api, tmp_path)
    sync.initial()
    assert sync.poll_once() is False and sync.take_update() is None          # nothing changed
    api.zones = [api_zone(version=2, points=RIGHT)]
    assert sync.poll_once() is True
    update = sync.take_update()
    assert [z.points[0] for z in update] == [(0.5, 0.0)]
    assert sync.take_update() is None                                       # delivered only once
    api.zones = [api_zone(version=3, points=RIGHT, enabled=False)]           # disabling is a change too
    assert sync.poll_once() and sync.take_update() == []
    assert json.loads((tmp_path / "zones-cache.json").read_text())["zones"][0]["version"] == 3


def test_poll_failure_keeps_current_zones(tmp_path, caplog) -> None:
    api = FakeApi([api_zone()])
    sync = make(api, tmp_path)
    sync.initial()
    api.down = True
    assert sync.poll_once() is False and sync.take_update() is None and "keeping the current zones" in caplog.text


def test_background_thread_picks_up_changes(tmp_path) -> None:
    api = FakeApi([api_zone()])
    client = ZoneApiClient("http://api.test", "k", transport=httpx.MockTransport(api))
    sync = ZoneSync(client, CAM, tmp_path / "c.json", poll_seconds=1)  # minimum poll interval allowed by config
    sync.initial()
    api.zones = [api_zone(version=2, points=RIGHT)]
    sync._poll = 0.05  # speed up the test only
    sync.start()
    try:
        deadline = datetime.now() + timedelta(seconds=5)
        update = None
        while update is None and datetime.now() < deadline:
            update = sync.take_update()
            threading.Event().wait(0.02)
        assert update is not None and update[0].points[0] == (0.5, 0.0)
    finally:
        sync.close()


def test_frame_size_mismatch_warns_once(tmp_path, caplog) -> None:
    caplog.set_level(logging.WARNING)
    sync = make(FakeApi([api_zone(w=768, h=576)]), tmp_path)
    sync.initial()
    sync.check_frame(768, 576)
    assert "drawn on" not in caplog.text
    sync.check_frame(1280, 720)
    sync.check_frame(1280, 720)
    assert caplog.text.count("drawn on a 768x576 frame but this stream is 1280x720") == 1
    assert "different shape" in caplog.text


# --- config --------------------------------------------------------------------------------------------

def test_config_api_mode_needs_no_toml_zones_and_file_mode_does() -> None:
    cfg = WorkerConfig.model_validate({"camera": {"id": CAM, "zones_source": "api"}, "source": {"type": "webcam"}})
    assert cfg.zones == [] and cfg.camera.zone_poll_seconds == 10.0
    with pytest.raises(ValueError, match="zones_source"):
        WorkerConfig.model_validate({"camera": {"id": CAM}, "source": {"type": "webcam"}})


# --- live swap in the pipeline -------------------------------------------------------------------------

class StandsRight:
    """One person (track 1) standing in the right half for the whole clip."""

    def update(self, frame):
        return [TrackedPerson(1, (740, 200, 780, 400), 0.9)]

    def reset(self):
        pass


def frames(n=40):
    t0 = datetime(2026, 11, 21, 10, 0, tzinfo=UTC)
    for i in range(n):
        yield Frame(np.zeros((576, 768, 3), np.uint8), i, t0 + timedelta(seconds=i / 10))


def test_pipeline_applies_a_saved_zone_change_without_restart(tmp_path) -> None:
    api = FakeApi([api_zone(points=LEFT)])
    sync = make(api, tmp_path)
    rule = RestrictedZoneRule(sync.initial())
    sent = []
    calls = {"n": 0}

    def zone_update():
        calls["n"] += 1
        if calls["n"] == 20:  # operator saves version 2 (zone moved to the right half) halfway through
            api.zones = [api_zone(version=2, points=RIGHT)]
            sync.poll_once()
        return sync.take_update()

    run_pipeline(frames(), StandsRight(), rule, sent.append, CAM, "s20261121100000abcd", threading.Event(),
                 zone_update=zone_update, frame_check=sync.check_frame)
    assert len(sent) == 1, "the person standing in the right half alerts once, only after the zone moved there"
    assert sent[0]["zone_id"] == "zone-a"
    assert sent[0]["occurred_at"] >= "2026-11-21T10:00:01.9"  # frame 19 + 3 confirmation frames


def test_unchanged_zone_keeps_state_and_does_not_realert() -> None:
    a = Zone("zone-a", "A", ((0.5, 0.0), (1.0, 0.0), (1.0, 1.0), (0.5, 1.0)))
    rule = RestrictedZoneRule([a])
    t0 = datetime(2026, 11, 21, tzinfo=UTC)
    p = [TrackedPerson(1, (740, 200, 780, 400), 0.9)]
    assert len([e for i in range(5) for e in rule.update(p, t0 + timedelta(seconds=i / 10), 768, 576)]) == 1
    rule.set_zones([Zone("zone-a", "Renamed only", a.points), Zone("zone-b", "B", ((0, 0), (0.4, 0), (0.4, 0.4)))])
    later = [e for i in range(5, 30) for e in rule.update(p, t0 + timedelta(seconds=i / 10), 768, 576)]
    assert later == [] and rule.is_inside(1, "zone-a")  # same shape: state kept, no second alert


def test_changed_zone_resets_state_so_people_inside_alert_again() -> None:
    a = Zone("zone-a", "A", ((0.5, 0.0), (1.0, 0.0), (1.0, 1.0), (0.5, 1.0)))
    rule = RestrictedZoneRule([a])
    t0 = datetime(2026, 11, 21, tzinfo=UTC)
    p = [TrackedPerson(1, (740, 200, 780, 400), 0.9)]
    [rule.update(p, t0 + timedelta(seconds=i / 10), 768, 576) for i in range(5)]
    rule.set_zones([Zone("zone-a", "A", ((0.6, 0.0), (1.0, 0.0), (1.0, 1.0), (0.6, 1.0)))])
    later = [e for i in range(5, 30) for e in rule.update(p, t0 + timedelta(seconds=i / 10), 768, 576)]
    assert len(later) == 1 and later[0].zone_id == "zone-a"
