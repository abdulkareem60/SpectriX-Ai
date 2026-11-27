"""HTTP routes. Thin: validate input, check access, call the service."""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Body, Depends, Header, Path, Query, Request, Response
from fastapi.responses import JSONResponse
from pydantic import AwareDatetime

from ..dependencies import get_incident_service, get_preview_store, get_repository, get_zone_service
from ..errors import ApiError, error_body
from ..repositories.base import IncidentRepository
from ..schemas.events import EventType, IngestResult, VisionEventV1
from ..schemas.incidents import AcknowledgeRequest, Incident, IncidentFilters, IncidentList, IncidentStatus
from ..schemas.zones import WorkerZoneList, ZoneV1
from ..security import Principal, require_operator, require_worker, require_zone_editor
from ..services.incidents import IncidentService
from ..services.previews import PreviewStore
from ..services.zones import ZoneService

Service = Annotated[IncidentService, Depends(get_incident_service)]
Operator = Annotated[Principal, Depends(require_operator)]

health_router = APIRouter(tags=["health"])
v1 = APIRouter(prefix="/v1")


@health_router.get("/health")
def health(repo: Annotated[IncidentRepository, Depends(get_repository)]) -> JSONResponse:
    try:
        repo.ping()
    except Exception:
        return JSONResponse(error_body("storage_unavailable", "Storage is not reachable."), status_code=503)
    return JSONResponse({"status": "ok", "storage": "ok"})


@v1.post("/events", tags=["worker"], response_model=IngestResult, status_code=201, dependencies=[Depends(require_worker)],
         responses={200: {"description": "Duplicate or merged event", "model": IngestResult}})
def ingest_event(event: VisionEventV1, response: Response, service: Service) -> IngestResult:
    result = service.ingest(event)
    if result.outcome != "created":
        response.status_code = 200
    return result


@v1.get("/incidents", tags=["incidents"], response_model=IncidentList)
def list_incidents(
    _: Operator,
    service: Service,
    status: IncidentStatus | None = None,
    camera_id: Annotated[str | None, Query(pattern=r"^[a-z0-9][a-z0-9_-]{0,63}$")] = None,
    event_type: EventType | None = None,
    occurred_from: AwareDatetime | None = Query(default=None, description="RFC 3339 with offset"),
    occurred_to: AwareDatetime | None = Query(default=None, description="RFC 3339 with offset"),
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    cursor: Annotated[str | None, Query(max_length=200)] = None,
) -> IncidentList:
    filters = IncidentFilters(status=status, camera_id=camera_id, event_type=event_type, occurred_from=occurred_from, occurred_to=occurred_to)
    return service.list(filters, limit, cursor)


@v1.get("/incidents/{incident_id}", tags=["incidents"], response_model=Incident)
def get_incident(incident_id: str, _: Operator, service: Service) -> Incident:
    return service.get(incident_id)


@v1.post("/incidents/{incident_id}/acknowledge", tags=["incidents"], response_model=Incident)
def acknowledge_incident(
    incident_id: str,
    principal: Operator,
    service: Service,
    body: Annotated[AcknowledgeRequest | None, Body()] = None,
) -> Incident:
    return service.acknowledge(incident_id, principal.uid, body.note if body else None)


# ---------------------------------------------------------------- zones
CameraId = Annotated[str, Path(pattern=r"^[a-z0-9][a-z0-9_-]{0,63}$")]
ZoneId = Annotated[str, Path(pattern=r"^[a-z0-9][a-z0-9_-]{0,63}$")]
ZoneSvc = Annotated[ZoneService, Depends(get_zone_service)]
ZoneEditor = Annotated[Principal, Depends(require_zone_editor)]


@v1.put("/cameras/{camera_id}/zones/{zone_id}", tags=["zones"], response_model=ZoneV1, status_code=201,
        responses={200: {"description": "Zone updated to the next version", "model": ZoneV1},
                   409: {"description": "Version is not the next one (stale edit)"}})
def put_zone(camera_id: CameraId, zone_id: ZoneId, zone: ZoneV1, response: Response, editor: ZoneEditor, service: ZoneSvc) -> ZoneV1:
    """Create a zone (version 1, `201`) or save its next version (`200`). Every version is kept."""
    if service.save(camera_id, zone_id, zone, editor.uid) == "updated":
        response.status_code = 200
    return zone


@v1.get("/cameras/{camera_id}/zones/{zone_id}", tags=["zones"], response_model=ZoneV1)
def get_zone(camera_id: CameraId, zone_id: ZoneId, _: Operator, service: ZoneSvc) -> ZoneV1:
    return service.get(camera_id, zone_id)


@v1.get("/worker/cameras/{camera_id}/zones", tags=["worker"], response_model=WorkerZoneList, dependencies=[Depends(require_worker)])
def worker_zones(camera_id: CameraId, service: ZoneSvc) -> WorkerZoneList:
    """Current zones for the worker's camera (worker key only). An unknown camera has no zones (empty list)."""
    return WorkerZoneList(camera_id=camera_id, zones=service.list_for_worker(camera_id))


# ---------------------------------------------------------------- camera preview
Previews = Annotated[PreviewStore, Depends(get_preview_store)]


@v1.put("/worker/cameras/{camera_id}/preview", tags=["worker"], status_code=204, dependencies=[Depends(require_worker)],
        responses={413: {"description": "Image too large"}, 415: {"description": "Not image/jpeg"},
                   422: {"description": "Not a complete JPEG"}})
async def put_preview(
    camera_id: CameraId,
    request: Request,
    store: Previews,
    content_type: Annotated[str, Header()] = "",
    x_captured_at: Annotated[str | None, Header()] = None,
) -> Response:
    """Latest preview frame from the worker (worker key only): a raw `image/jpeg` body. Only the newest frame is kept,
    in memory. `X-Captured-At` (RFC 3339) is when the worker read the frame."""
    if content_type.split(";")[0].strip().lower() != "image/jpeg":
        raise ApiError(415, "unsupported_media_type", "Send the preview as a raw body with Content-Type: image/jpeg.")
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > store.max_bytes:
        raise ApiError(413, "preview_too_large", f"Preview images must be at most {store.max_bytes} bytes.")
    captured_at = None
    if x_captured_at:
        try:
            captured_at = datetime.fromisoformat(x_captured_at.replace("Z", "+00:00"))
        except ValueError:
            raise ApiError(422, "invalid_captured_at", "X-Captured-At must be an RFC 3339 timestamp.") from None
        if captured_at.tzinfo is None:
            raise ApiError(422, "invalid_captured_at", "X-Captured-At must include a timezone offset.")
    store.put(camera_id, await request.body(), captured_at)
    return Response(status_code=204)


@v1.get("/cameras/{camera_id}/preview", tags=["cameras"], response_class=Response,
        responses={200: {"content": {"image/jpeg": {}}, "description": "Latest preview frame"},
                   404: {"description": "No preview received yet (preview_not_available)"}})
def get_preview(camera_id: CameraId, _: Operator, store: Previews) -> Response:
    """Latest preview frame for a camera (operators only). `X-Preview-Age-Seconds` is how long ago the API received it,
    by the API's clock, so clients can mark the preview stale without trusting their own clock."""
    preview = store.get(camera_id)
    headers = {
        "Cache-Control": "no-store",
        "X-Preview-Age-Seconds": f"{preview.age_seconds():.1f}",
        "X-Camera-Id": camera_id,
    }
    if preview.captured_at is not None:
        headers["X-Captured-At"] = preview.captured_at.isoformat()
    return Response(content=preview.image, media_type="image/jpeg", headers=headers)
