"""Camera preview: worker uploads the latest JPEG, operators read it; nothing else can do either."""

import time

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.dependencies import get_preview_store
from app.services.previews import PreviewStore

from .conftest import ADMIN, OPERATOR, WORKER

CAM = "cam-laptop"
URL_PUT = f"/v1/worker/cameras/{CAM}/preview"
URL_GET = f"/v1/cameras/{CAM}/preview"


def jpeg(value: int = 128) -> bytes:
    """JPEG-framed bytes (start and end markers). The API checks framing and size; it never decodes images."""
    return b"\xff\xd8\xff\xe0" + bytes([value]) * 64 + b"\xff\xd9"


def put(client: TestClient, body: bytes, headers: dict | None = None, camera: str = CAM):
    h = {**WORKER, "Content-Type": "image/jpeg", **(headers or {})}
    return client.put(f"/v1/worker/cameras/{camera}/preview", content=body, headers=h)


def test_operator_sees_waiting_state_before_the_first_frame(client: TestClient) -> None:
    r = client.get(URL_GET, headers=OPERATOR)
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "preview_not_available"


def test_worker_upload_then_operator_reads_the_same_image(client: TestClient) -> None:
    img = jpeg()
    r = put(client, img, {"X-Captured-At": "2026-11-22T10:00:00.250000+00:00"})
    assert r.status_code == 204
    r = client.get(URL_GET, headers=OPERATOR)
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/jpeg"
    assert r.content == img
    assert r.headers["cache-control"] == "no-store"
    assert r.headers["x-camera-id"] == CAM
    assert r.headers["x-captured-at"] == "2026-11-22T10:00:00.250000+00:00"
    assert 0.0 <= float(r.headers["x-preview-age-seconds"]) < 5.0


def test_only_the_latest_frame_is_kept(client: TestClient) -> None:
    put(client, jpeg(10))
    newest = jpeg(200)
    put(client, newest)
    assert client.get(URL_GET, headers=OPERATOR).content == newest


def test_age_grows_when_frames_stop(client: TestClient, preview_store: PreviewStore) -> None:
    put(client, jpeg())
    received = preview_store.get(CAM)
    assert received.age_seconds(now_monotonic=received._received_monotonic + 12.5) == pytest.approx(12.5)


def test_cameras_are_kept_apart(client: TestClient) -> None:
    put(client, jpeg(), camera="cam-other")
    assert client.get(URL_GET, headers=OPERATOR).status_code == 404
    assert client.get("/v1/cameras/cam-other/preview", headers=OPERATOR).status_code == 200


@pytest.mark.parametrize("headers, status", [({}, 401), ({"X-Worker-Key": "wrong"}, 401), (OPERATOR, 401), (ADMIN, 401)])
def test_upload_needs_the_worker_key_not_a_user_token(client: TestClient, headers: dict, status: int) -> None:
    r = client.put(URL_PUT, content=jpeg(), headers={"Content-Type": "image/jpeg", **headers})
    assert r.status_code == status
    assert client.get(URL_GET, headers=OPERATOR).status_code == 404, "nothing stored"


@pytest.mark.parametrize("headers, status", [({}, 401), (WORKER, 401), ({"Authorization": "Bearer viewer-token"}, 403)])
def test_reading_needs_an_operator_role_not_the_worker_key(client: TestClient, headers: dict, status: int) -> None:
    put(client, jpeg())
    assert client.get(URL_GET, headers=headers).status_code == status


def test_upload_is_refused_when_no_worker_keys_are_configured(client: TestClient, settings) -> None:
    settings.worker_api_keys = SecretStr("")
    assert put(client, jpeg()).status_code == 503


def test_wrong_content_type_is_refused(client: TestClient) -> None:
    r = client.put(URL_PUT, content=jpeg(), headers={**WORKER, "Content-Type": "application/octet-stream"})
    assert r.status_code == 415
    assert r.json()["error"]["code"] == "unsupported_media_type"


@pytest.mark.parametrize("body", [b"", b"not a jpeg", b"\xff\xd8\xff\xe0truncated", b"\x89PNG\r\n\x1a\n...."])
def test_non_jpeg_or_truncated_body_is_refused(client: TestClient, body: bytes) -> None:
    r = put(client, body)
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "invalid_preview"


def test_oversized_image_is_refused(client: TestClient, preview_store: PreviewStore) -> None:
    too_big = b"\xff\xd8\xff" + b"\x00" * preview_store.max_bytes + b"\xff\xd9"
    r = put(client, too_big)
    assert r.status_code == 413
    assert r.json()["error"]["code"] == "preview_too_large"


@pytest.mark.parametrize("value", ["yesterday", "2026-11-22T10:00:00"])
def test_bad_captured_at_is_refused(client: TestClient, value: str) -> None:
    r = put(client, jpeg(), {"X-Captured-At": value})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "invalid_captured_at"


def test_camera_limit_bounds_memory(client: TestClient) -> None:
    small = PreviewStore(max_cameras=2)
    client.app.dependency_overrides[get_preview_store] = lambda: small
    assert put(client, jpeg(), camera="cam-a").status_code == 204
    assert put(client, jpeg(), camera="cam-b").status_code == 204
    assert put(client, jpeg(), camera="cam-c").status_code == 429
    assert put(client, jpeg(), camera="cam-a").status_code == 204, "an existing camera can still update"


def test_invalid_camera_id_is_refused(client: TestClient) -> None:
    assert put(client, jpeg(), camera="Cam With Spaces").status_code in (404, 422)
    assert client.get("/v1/cameras/CAM_UPPER/preview", headers=OPERATOR).status_code == 422


def test_dashboard_can_read_the_freshness_headers_cross_origin(client: TestClient) -> None:
    put(client, jpeg())
    r = client.get(URL_GET, headers={**OPERATOR, "Origin": "http://localhost:3000"})
    exposed = r.headers.get("access-control-expose-headers", "").lower()
    assert "x-preview-age-seconds" in exposed and "x-captured-at" in exposed


def test_store_age_uses_the_api_clock() -> None:
    store = PreviewStore()
    p = store.put(CAM, jpeg(), None)
    time.sleep(0.05)
    assert p.age_seconds() >= 0.05
