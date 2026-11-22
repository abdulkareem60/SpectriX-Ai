"""Camera preview: throttled, never blocks detection or alerts, tolerates API failures."""

import logging
import threading
import time
from datetime import UTC, datetime, timedelta

import cv2
import httpx
import numpy as np
import pytest

from nigah_worker.config import WorkerConfig
from nigah_worker.detection import TrackedPerson
from nigah_worker.pipeline import run_pipeline
from nigah_worker.preview import PreviewUploader, encode_preview
from nigah_worker.rules import RestrictedZoneRule
from nigah_worker.sources import Frame
from nigah_worker.zones import Zone

CAM = "cam-laptop"
WHOLE_FRAME = Zone("zone-all", "All", ((0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0)))
T0 = datetime(2026, 11, 22, 10, 0, tzinfo=UTC)


class PersonInside:
    def update(self, frame):
        return [TrackedPerson(1, (300, 200, 400, 500), 0.9)]

    def reset(self):
        pass


def frames(n=30, fps=10):
    for i in range(n):
        yield Frame(np.full((480, 640, 3), 40, np.uint8), i, T0 + timedelta(seconds=i / fps))


class FakeClock:
    def __init__(self) -> None:
        self.t = 0.0

    def __call__(self) -> float:
        return self.t


class Api:
    """Records preview uploads; can be slow, failing or down."""

    def __init__(self, status=204, delay=0.0, down=False):
        self.status, self.delay, self.down = status, delay, down
        self.requests: list[httpx.Request] = []

    def __call__(self, request: httpx.Request) -> httpx.Response:
        if self.delay:
            time.sleep(self.delay)
        if self.down:
            raise httpx.ConnectError("refused")
        self.requests.append(request)
        if self.status != 204:
            return httpx.Response(self.status, json={"error": {"code": "x", "message": "nope"}})
        return httpx.Response(204)


def uploader(api: Api, clock=time.monotonic, interval=1.0) -> PreviewUploader:
    return PreviewUploader("http://api.test", "worker-secret", CAM, interval_seconds=interval,
                           transport=httpx.MockTransport(api), clock=clock)


def wait_for(cond, timeout=3.0) -> None:
    end = time.monotonic() + timeout
    while not cond() and time.monotonic() < end:
        time.sleep(0.01)


# --- encoding --------------------------------------------------------------------------------------------

def test_encode_downscales_wide_frames_and_keeps_aspect_ratio() -> None:
    data = encode_preview(np.zeros((1080, 1920, 3), np.uint8), max_width=640, quality=70)
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    assert img.shape[:2] == (360, 640)
    assert data[:3] == b"\xff\xd8\xff" and data[-2:] == b"\xff\xd9"


def test_encode_leaves_small_frames_at_their_size() -> None:
    data = encode_preview(np.zeros((240, 320, 3), np.uint8), max_width=640, quality=70)
    assert cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR).shape[:2] == (240, 320)


# --- upload ----------------------------------------------------------------------------------------------

def test_upload_uses_worker_key_camera_path_and_capture_time() -> None:
    api = Api()
    up = uploader(api)
    assert up.send_once(np.zeros((48, 64, 3), np.uint8), T0)
    r = api.requests[0]
    assert r.method == "PUT"
    assert r.url.path == f"/v1/worker/cameras/{CAM}/preview"
    assert r.headers["X-Worker-Key"] == "worker-secret"
    assert r.headers["Content-Type"] == "image/jpeg"
    assert r.headers["X-Captured-At"] == "2026-11-22T10:00:00+00:00"
    assert r.content[:3] == b"\xff\xd8\xff"


def test_empty_worker_key_is_refused() -> None:
    with pytest.raises(ValueError, match="NIGAHSENSE_WORKER_KEY"):
        PreviewUploader("http://api.test", "", CAM)


@pytest.mark.parametrize("api", [Api(status=500), Api(status=401), Api(down=True)])
def test_failures_are_counted_and_logged_never_raised(api: Api, caplog) -> None:
    up = uploader(api)
    with caplog.at_level(logging.WARNING, "nigah_worker.preview"):
        assert not up.send_once(np.zeros((48, 64, 3), np.uint8), T0)
        assert not up.send_once(np.zeros((48, 64, 3), np.uint8), T0)
    assert up.failed == 2
    assert len([r for r in caplog.records if "Preview upload failed" in r.message]) == 1, "rate-limited"


def test_recovery_is_logged(caplog) -> None:
    api = Api(down=True)
    up = uploader(api)
    up.send_once(np.zeros((48, 64, 3), np.uint8), T0)
    api.down = False
    with caplog.at_level(logging.INFO, "nigah_worker.preview"):
        assert up.send_once(np.zeros((48, 64, 3), np.uint8), T0)
    assert any("resumed" in r.message for r in caplog.records)


# --- throttling and non-blocking ------------------------------------------------------------------------

def test_due_is_throttled_by_the_interval() -> None:
    clock = FakeClock()
    up = uploader(Api(), clock=clock, interval=1.0)
    assert up.due()
    up.submit(np.zeros((4, 4, 3), np.uint8), T0)
    clock.t = 0.5
    assert not up.due()
    clock.t = 1.0
    assert up.due()


def test_submit_replaces_a_waiting_frame_instead_of_queueing() -> None:
    up = uploader(Api())  # thread not started: nothing is taken
    up.submit(np.zeros((4, 4, 3), np.uint8), T0)
    up.submit(np.ones((4, 4, 3), np.uint8), T0)
    assert up.dropped == 1
    assert up._take()[0][0, 0, 0] == 1, "the newest frame wins"
    assert up._take() is None


def test_slow_api_never_slows_detection_or_alerts() -> None:
    api = Api(delay=1.0)  # every upload takes a full second
    up = uploader(api, interval=0.0)  # offer a frame on every processed frame
    up.start()
    sent: list[dict] = []
    t = time.monotonic()
    try:
        stats = run_pipeline(frames(30), PersonInside(), RestrictedZoneRule([WHOLE_FRAME]), sent.append, CAM,
                             "s20261122100000abcd", threading.Event(), preview=up)
    finally:
        elapsed = time.monotonic() - t
        up.close(timeout=0.1)
    assert stats.frames_processed == 30
    assert len(sent) == 1 and sent[0]["camera_id"] == CAM, "the alert is published as usual"
    assert elapsed < 1.0, f"pipeline waited for preview uploads ({elapsed:.2f}s)"
    assert up.dropped > 20, "frames were dropped while the slow upload was in progress, not queued"


def test_api_down_does_not_stop_the_pipeline() -> None:
    up = uploader(Api(down=True), interval=0.0)
    up.start()
    sent: list[dict] = []
    try:
        stats = run_pipeline(frames(20), PersonInside(), RestrictedZoneRule([WHOLE_FRAME]), sent.append, CAM,
                             "s20261122100000abcd", threading.Event(), preview=up)
        wait_for(lambda: up.failed >= 1)
    finally:
        up.close()
    assert stats.frames_processed == 20 and len(sent) == 1
    assert up.failed >= 1 and up.sent == 0


def test_pipeline_sends_annotated_frames_at_the_interval() -> None:
    """10 fps clip of 3 s with a 1 s interval: about 3 previews, each showing the zone overlay."""
    api = Api()
    clock = FakeClock()
    up = uploader(api, clock=clock, interval=1.0)
    submitted: list[tuple[np.ndarray, datetime]] = []
    real_submit = up.submit

    def spy(image, captured_at):
        submitted.append((image, captured_at))
        real_submit(image, captured_at)

    up.submit = spy

    def timed_frames():
        for f in frames(30, fps=10):
            clock.t = (f.captured_at - T0).total_seconds()
            yield f

    run_pipeline(timed_frames(), PersonInside(), RestrictedZoneRule([WHOLE_FRAME]), lambda e: None, CAM,
                 "s20261122100000abcd", threading.Event(), preview=up)
    assert [c.isoformat() for _, c in submitted] == [
        "2026-11-22T10:00:00+00:00", "2026-11-22T10:00:01+00:00", "2026-11-22T10:00:02+00:00"]
    raw = np.full((480, 640, 3), 40, np.uint8)
    assert not np.array_equal(submitted[0][0], raw), "the preview shows the annotated frame (zone, boxes)"


def test_without_preview_the_pipeline_is_unchanged() -> None:
    sent: list[dict] = []
    stats = run_pipeline(frames(10), PersonInside(), RestrictedZoneRule([WHOLE_FRAME]), sent.append, CAM,
                         "s20261122100000abcd", threading.Event())
    assert stats.frames_processed == 10 and len(sent) == 1


# --- config ----------------------------------------------------------------------------------------------

BASE = {"camera": {"id": CAM}, "source": {"type": "webcam"}, "zones": [{"id": "z", "points": [[0, 0], [1, 0], [1, 1]]}]}


def test_preview_is_off_unless_enabled() -> None:
    assert WorkerConfig.model_validate(BASE).preview.enabled is False


def test_preview_settings_are_validated() -> None:
    cfg = WorkerConfig.model_validate({**BASE, "preview": {"enabled": True, "interval_seconds": 0.5, "max_width": 480}})
    assert cfg.preview.enabled and cfg.preview.interval_seconds == 0.5 and cfg.preview.max_width == 480
    with pytest.raises(ValueError):
        WorkerConfig.model_validate({**BASE, "preview": {"enabled": True, "interval_seconds": 0.01}})
    with pytest.raises(ValueError):
        WorkerConfig.model_validate({**BASE, "preview": {"enabled": True, "url": "rtsp://x"}})
