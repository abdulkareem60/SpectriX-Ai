"""Zones from the API (camera zones_source = "api").

At start the worker fetches its camera's zones from GET /v1/worker/cameras/{camera_id}/zones. A background
thread then checks every `zone_poll_seconds`; when a zone's version or enabled flag changes, the pipeline
swaps the zones in between two frames (no restart). The last zones received are cached on disk, so the
worker can start with them if the API is down. It never starts silently with no zones: with no API and no
cache it stops with a clear error.
"""

import json
import logging
import math
import threading
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx

from .zones import Zone

log = logging.getLogger("nigah_worker.zone_sync")


class ZoneSyncError(RuntimeError):
    """Zones could not be loaded from the API or the cache."""


@dataclass(frozen=True)
class ApiZone:
    zone: Zone
    version: int
    enabled: bool
    ref_width: int
    ref_height: int


def parse_zones(payload: dict[str, Any], camera_id: str) -> list[ApiZone]:
    """Turn the API response into zones, skipping (with an error log) any zone that is malformed."""
    if payload.get("camera_id") != camera_id:
        raise ZoneSyncError(f"response is for camera {payload.get('camera_id')!r}, expected {camera_id!r}")
    out: list[ApiZone] = []
    for z in payload.get("zones", []):
        try:
            pts = tuple((float(p["x"]), float(p["y"])) for p in z["points"])
            if len(pts) < 3 or not all(math.isfinite(v) and 0.0 <= v <= 1.0 for p in pts for v in p):
                raise ValueError("points must be 3+ finite fractions between 0 and 1")
            ref = z["reference_frame"]
            if int(ref["width"]) < 1 or int(ref["height"]) < 1:
                raise ValueError("reference frame size must be positive")
            out.append(ApiZone(Zone(z["zone_id"], z.get("name", ""), pts), int(z["version"]), bool(z["enabled"]),
                               int(ref["width"]), int(ref["height"])))
        except (KeyError, TypeError, ValueError) as e:
            log.error("Ignoring malformed zone %r from the API: %s", z.get("zone_id") if isinstance(z, dict) else z, e)
    return out


def fingerprint(zones: list[ApiZone]) -> tuple:
    return tuple(sorted((z.zone.id, z.version, z.enabled) for z in zones))


class ZoneApiClient:
    def __init__(self, base_url: str, worker_key: str, timeout: float = 10.0, transport: httpx.BaseTransport | None = None) -> None:
        if not worker_key:
            raise ValueError("NIGAHSENSE_WORKER_KEY is empty; the API will refuse to send zones without it.")
        self._client = httpx.Client(base_url=base_url.rstrip("/"), timeout=timeout, transport=transport,
                                    headers={"X-Worker-Key": worker_key, "User-Agent": "nigahsense-worker/0.1"})

    def fetch(self, camera_id: str) -> dict[str, Any]:
        r = self._client.get(f"/v1/worker/cameras/{camera_id}/zones")
        if r.status_code != 200:
            try:
                detail = r.json().get("error", {}).get("message", r.text[:200])
            except ValueError:
                detail = r.text[:200]
            raise ZoneSyncError(f"API returned HTTP {r.status_code}: {detail}")
        return r.json()

    def close(self) -> None:
        self._client.close()


class ZoneSync:
    def __init__(self, client: ZoneApiClient, camera_id: str, cache_path: str | Path, poll_seconds: float = 10.0,
                 stop: threading.Event | None = None) -> None:
        self._client = client
        self._camera = camera_id
        self._cache = Path(cache_path)
        self._poll = poll_seconds
        self._stop = stop or threading.Event()
        self._lock = threading.Lock()
        self._pending: list[ApiZone] | None = None
        self._current: list[ApiZone] = []
        self._checked: tuple | None = None
        self._thread: threading.Thread | None = None

    # -- startup ----------------------------------------------------------------------------------------
    def initial(self) -> list[Zone]:
        try:
            zones = parse_zones(self._client.fetch(self._camera), self._camera)
            self._save_cache(zones)
            source = "API"
        except (httpx.HTTPError, ZoneSyncError, ValueError) as e:
            zones = self._load_cache()
            if zones is None:
                raise ZoneSyncError(f"Could not load zones from the API ({e}) and there is no saved copy at {self._cache}. "
                                    "Start the API, or use zones_source = \"file\".") from None
            log.warning("API unavailable (%s); starting with the zones saved at %s", e, self._cache)
            source = "saved copy"
        self._current = zones
        self._log_zones(zones, f"Loaded zones from the {source}")
        return self.active_zones(zones)

    # -- background polling ------------------------------------------------------------------------------
    def start(self) -> None:
        self._thread = threading.Thread(target=self._run, name="zone-sync", daemon=True)
        self._thread.start()

    def _run(self) -> None:
        while not self._stop.wait(self._poll):
            self.poll_once()

    def poll_once(self) -> bool:
        """Fetch once; queue an update if anything changed. Returns True when an update was queued."""
        try:
            zones = parse_zones(self._client.fetch(self._camera), self._camera)
        except (httpx.HTTPError, ZoneSyncError, ValueError) as e:
            log.warning("Zone check failed (%s); keeping the current zones", e)
            return False
        if fingerprint(zones) == fingerprint(self._current):
            return False
        self._save_cache(zones)
        with self._lock:
            self._pending = zones
        return True

    def take_update(self) -> list[Zone] | None:
        """Called by the pipeline between frames. Returns the new active zones once per change, else None."""
        with self._lock:
            zones, self._pending = self._pending, None
        if zones is None:
            return None
        self._current = zones
        self._checked = None
        self._log_zones(zones, "Zones changed; now using")
        return self.active_zones(zones)

    def check_frame(self, width: int, height: int) -> None:
        """Warn once per zone set if the analysed frame size differs from the frame a zone was drawn on."""
        key = (width, height, fingerprint(self._current))
        if key == self._checked:
            return
        self._checked = key
        for z in self._current:
            if z.enabled and (z.ref_width, z.ref_height) != (width, height):
                same_shape = abs(z.ref_width / z.ref_height - width / height) < 0.01
                log.warning("Zone %s v%d was drawn on a %dx%d frame but this stream is %dx%d%s. Review the zone.",
                            z.zone.id, z.version, z.ref_width, z.ref_height, width, height,
                            "" if same_shape else " (different shape: the zone may be misaligned)")

    def close(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=5)
        self._client.close()

    # -- helpers -----------------------------------------------------------------------------------------
    @staticmethod
    def active_zones(zones: list[ApiZone]) -> list[Zone]:
        return [z.zone for z in zones if z.enabled]

    def _log_zones(self, zones: list[ApiZone], prefix: str) -> None:
        active = [f"{z.zone.id} v{z.version}" for z in zones if z.enabled]
        disabled = [z.zone.id for z in zones if not z.enabled]
        if active:
            log.info("%s: %s%s", prefix, ", ".join(active), f" (disabled: {', '.join(disabled)})" if disabled else "")
        else:
            log.warning("%s: no enabled zones for camera %s; nothing will alert until a zone is saved or enabled",
                        prefix, self._camera)

    def _save_cache(self, zones: list[ApiZone]) -> None:
        data = {"camera_id": self._camera, "saved_at": datetime.now(UTC).isoformat(),
                "zones": [{"zone_id": z.zone.id, "name": z.zone.name, "version": z.version, "enabled": z.enabled,
                           "points": [{"x": x, "y": y} for x, y in z.zone.points],
                           "reference_frame": {"width": z.ref_width, "height": z.ref_height}} for z in zones]}
        try:
            self._cache.parent.mkdir(parents=True, exist_ok=True)
            tmp = self._cache.with_suffix(self._cache.suffix + ".tmp")
            tmp.write_text(json.dumps(data, indent=1), encoding="utf-8")
            tmp.replace(self._cache)  # never leave a half-written cache
        except OSError as e:
            log.warning("Could not save zones cache %s: %s", self._cache, e)

    def _load_cache(self) -> list[ApiZone] | None:
        try:
            data = json.loads(self._cache.read_text(encoding="utf-8"))
            return parse_zones(data, self._camera)
        except FileNotFoundError:
            return None
        except (OSError, ValueError, ZoneSyncError) as e:
            log.error("Ignoring zones cache %s: %s", self._cache, e)
            return None
