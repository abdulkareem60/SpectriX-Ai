"""Camera preview: a small, throttled JPEG of the frames the worker is analysing, sent to the API.

The dashboard shows it as "Camera preview". Detection never waits for it:
  * the pipeline asks `due()` (a clock check) and, about once per `interval_seconds`, hands over the annotated
    frame with `submit()`, which only stores a reference and wakes the uploader thread;
  * the uploader thread resizes, JPEG-encodes and PUTs the newest frame. If an upload is still running when the
    next frame is submitted, the older one is simply replaced (dropped), so a slow or stopped API never builds a
    backlog and never delays tracking or alert publishing.

The camera URL never leaves the worker; the API only receives finished JPEG frames, authenticated by the worker key.
"""

import logging
import threading
import time
from datetime import datetime

import cv2
import httpx
import numpy as np

log = logging.getLogger("nigah_worker.preview")

FAILURE_LOG_EVERY_SECONDS = 30.0


def encode_preview(image: np.ndarray, max_width: int, quality: int) -> bytes:
    """Downscale to at most `max_width` pixels wide (keeping the aspect ratio) and encode as JPEG."""
    h, w = image.shape[:2]
    if w > max_width:
        image = cv2.resize(image, (max_width, max(1, round(h * max_width / w))), interpolation=cv2.INTER_AREA)
    ok, buf = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, int(quality)])
    if not ok:
        raise ValueError("JPEG encoding failed")
    return buf.tobytes()


class PreviewUploader:
    def __init__(
        self,
        base_url: str,
        worker_key: str,
        camera_id: str,
        interval_seconds: float = 1.0,
        max_width: int = 640,
        jpeg_quality: int = 70,
        timeout: float = 5.0,
        transport: httpx.BaseTransport | None = None,
        clock=time.monotonic,
    ) -> None:
        if not worker_key:
            raise ValueError("NIGAHSENSE_WORKER_KEY is empty; the API will refuse preview frames without it.")
        self._client = httpx.Client(base_url=base_url.rstrip("/"), timeout=timeout, transport=transport,
                                    headers={"X-Worker-Key": worker_key, "User-Agent": "nigahsense-worker/0.1"})
        self._path = f"/v1/worker/cameras/{camera_id}/preview"
        self._interval = interval_seconds
        self._max_width = max_width
        self._quality = jpeg_quality
        self._clock = clock
        self._next_due = 0.0
        self._lock = threading.Lock()
        self._pending: tuple[np.ndarray, datetime] | None = None
        self._wake = threading.Event()
        self._closing = threading.Event()
        self._thread: threading.Thread | None = None
        self._failing_since: float | None = None
        self._last_failure_log = 0.0
        self.sent = 0
        self.failed = 0
        self.dropped = 0  # frames replaced before the uploader got to them

    # --- called from the pipeline thread (must stay cheap) ---------------------------------------------------
    def due(self) -> bool:
        return self._clock() >= self._next_due

    def submit(self, image: np.ndarray, captured_at: datetime) -> None:
        """Hand over the frame to show next. Never blocks on the network. `image` must not be modified afterwards."""
        self._next_due = self._clock() + self._interval
        with self._lock:
            if self._pending is not None:
                self.dropped += 1
            self._pending = (image, captured_at)
        self._wake.set()

    # --- uploader thread -------------------------------------------------------------------------------------
    def start(self) -> None:
        self._thread = threading.Thread(target=self._run, name="preview-uploader", daemon=True)
        self._thread.start()

    def _take(self) -> tuple[np.ndarray, datetime] | None:
        with self._lock:
            item, self._pending = self._pending, None
        return item

    def _run(self) -> None:
        while not self._closing.is_set():
            self._wake.wait(timeout=0.5)
            self._wake.clear()
            item = self._take()
            if item is not None:
                self.send_once(*item)

    def send_once(self, image: np.ndarray, captured_at: datetime) -> bool:
        """Encode and upload one frame. Errors are logged (rate-limited) and counted, never raised."""
        try:
            body = encode_preview(image, self._max_width, self._quality)
            r = self._client.put(self._path, content=body,
                                 headers={"Content-Type": "image/jpeg", "X-Captured-At": captured_at.isoformat()})
            ok = r.status_code == 204
            error = "" if ok else f"HTTP {r.status_code}: {_message(r)}"
        except (httpx.HTTPError, ValueError, cv2.error) as e:
            ok, error = False, str(e) or type(e).__name__
        now = self._clock()
        if ok:
            self.sent += 1
            if self._failing_since is not None:
                log.info("Preview uploads resumed after %.0fs", now - self._failing_since)
                self._failing_since = None
            return True
        self.failed += 1
        if self._failing_since is None:
            self._failing_since = now
        if now - self._last_failure_log >= FAILURE_LOG_EVERY_SECONDS or self.failed == 1:
            log.warning("Preview upload failed (%s); detection and alerts continue. Next report in %.0fs if it keeps failing.",
                        error, FAILURE_LOG_EVERY_SECONDS)
            self._last_failure_log = now
        return False

    def close(self, timeout: float = 3.0) -> None:
        self._closing.set()
        self._wake.set()
        if self._thread:
            self._thread.join(timeout)
        self._client.close()


def _message(r: httpx.Response) -> str:
    try:
        return r.json().get("error", {}).get("message", r.text[:200])
    except ValueError:
        return r.text[:200]
