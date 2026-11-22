"""Camera preview: the latest small JPEG per camera, held in memory only.

The vision worker uploads a throttled, downscaled frame (about one per second) with its worker key; signed-in
operators read the latest one. Nothing is written to Firestore or disk, and only the newest frame per camera is
kept, so this is a near-live preview, not recording. One API process holds the frames: with several API
instances, a shared store (for example Redis) would be needed.
"""

import threading
import time
from dataclasses import dataclass
from datetime import UTC, datetime

from ..errors import ApiError

MAX_PREVIEW_BYTES = 512 * 1024  # a 640-px JPEG at quality 70 is typically 30-80 KB
MAX_CAMERAS = 32  # bounds memory if a worker key is misused


@dataclass(frozen=True)
class Preview:
    image: bytes
    captured_at: datetime | None  # when the worker read the frame (worker clock)
    received_at: datetime  # when the API stored it (API clock, UTC)
    _received_monotonic: float

    def age_seconds(self, now_monotonic: float | None = None) -> float:
        """Seconds since the API received this frame, by the API's own clock (immune to client clock skew)."""
        return max(0.0, (time.monotonic() if now_monotonic is None else now_monotonic) - self._received_monotonic)


def looks_like_jpeg(data: bytes) -> bool:
    return len(data) >= 4 and data[:3] == b"\xff\xd8\xff" and data[-2:] == b"\xff\xd9"


class PreviewStore:
    def __init__(self, max_bytes: int = MAX_PREVIEW_BYTES, max_cameras: int = MAX_CAMERAS) -> None:
        self._max_bytes = max_bytes
        self._max_cameras = max_cameras
        self._lock = threading.Lock()
        self._latest: dict[str, Preview] = {}

    @property
    def max_bytes(self) -> int:
        return self._max_bytes

    def put(self, camera_id: str, image: bytes, captured_at: datetime | None) -> Preview:
        if len(image) > self._max_bytes:
            raise ApiError(413, "preview_too_large", f"Preview images must be at most {self._max_bytes} bytes.")
        if not looks_like_jpeg(image):
            raise ApiError(422, "invalid_preview", "The preview must be a complete JPEG image.")
        preview = Preview(image, captured_at, datetime.now(UTC), time.monotonic())
        with self._lock:
            if camera_id not in self._latest and len(self._latest) >= self._max_cameras:
                raise ApiError(429, "preview_camera_limit", f"Previews are kept for at most {self._max_cameras} cameras.")
            self._latest[camera_id] = preview
        return preview

    def get(self, camera_id: str) -> Preview:
        with self._lock:
            preview = self._latest.get(camera_id)
        if preview is None:
            raise ApiError(404, "preview_not_available", "No preview has been received for this camera yet.")
        return preview
