"""Wiring: which repositories and services the routes use. Tests override get_repository and get_zone_repository."""

from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from .config import Settings, get_settings
from .repositories.base import IncidentRepository, ZoneRepository
from .repositories.memory import MemoryIncidentRepository, MemoryZoneRepository
from .services.incidents import IncidentService
from .services.previews import PreviewStore
from .services.zones import ZoneService


@lru_cache
def _repository_for(backend: str, project_id: str) -> IncidentRepository:
    if backend == "memory":
        return MemoryIncidentRepository()
    from .repositories.firestore import FirestoreIncidentRepository, make_client

    return FirestoreIncidentRepository(make_client(project_id))


def get_repository(settings: Annotated[Settings, Depends(get_settings)]) -> IncidentRepository:
    return _repository_for(settings.storage_backend, settings.firebase_project_id)


def get_incident_service(
    repo: Annotated[IncidentRepository, Depends(get_repository)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> IncidentService:
    return IncidentService(repo, max_future_skew_seconds=settings.max_future_skew_seconds)


@lru_cache
def _zone_repository_for(backend: str, project_id: str) -> ZoneRepository:
    if backend == "memory":
        return MemoryZoneRepository()
    from .repositories.firestore import FirestoreZoneRepository, make_client

    return FirestoreZoneRepository(make_client(project_id))


def get_zone_repository(settings: Annotated[Settings, Depends(get_settings)]) -> ZoneRepository:
    return _zone_repository_for(settings.storage_backend, settings.firebase_project_id)


def get_zone_service(repo: Annotated[ZoneRepository, Depends(get_zone_repository)]) -> ZoneService:
    return ZoneService(repo)


_preview_store = PreviewStore()


def get_preview_store() -> PreviewStore:
    """One in-memory store per API process (see services/previews.py). Tests override this."""
    return _preview_store
