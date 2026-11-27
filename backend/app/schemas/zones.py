"""Zone v1: mirrors contracts/zone.v1.schema.json and adds the polygon checks JSON Schema cannot express.

Coordinates are fractions of the full analysis frame: origin top-left, x to the right, y downwards,
both 0..1. The polygon closes automatically (do not repeat the first point).
"""

import math
from typing import Annotated, Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, StringConstraints, field_validator

from .events import IdStr

MIN_POINTS = 3
MAX_POINTS = 32
# Smallest allowed zone, as a fraction of the frame area. 0.001 = 0.1 % of the frame, for example about
# 21 x 21 px on a 768 x 576 frame. Smaller shapes are almost always mis-clicks and too small to alert reliably.
MIN_AREA_FRACTION = 0.001
# Two vertices closer than this (in frame fractions) count as the same point: far below one pixel at any
# supported resolution (max 16384 px).
DUPLICATE_TOLERANCE = 1e-6
_EPS = 1e-12

Unit = Annotated[float, Field(ge=0.0, le=1.0, allow_inf_nan=False, strict=True)]  # strict: no numeric strings
ZoneName = Annotated[str, StringConstraints(min_length=1, max_length=80, pattern=r"\S")]
FrameSide = Annotated[int, Field(ge=1, le=16384, strict=True)]


class ZonePoint(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    x: Unit
    y: Unit


class ReferenceFrame(BaseModel):
    """The still frame the zone was drawn on; must match the frame size the worker analyses."""

    model_config = ConfigDict(extra="forbid")

    width: FrameSide
    height: FrameSide
    captured_at: AwareDatetime


class ZoneV1(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["1.0"]
    camera_id: IdStr
    zone_id: IdStr
    name: ZoneName
    kind: Literal["restricted"]
    enabled: Annotated[bool, Field(strict=True)]
    version: Annotated[int, Field(ge=1, strict=True)]
    points: Annotated[list[ZonePoint], Field(min_length=MIN_POINTS, max_length=MAX_POINTS)]
    reference_frame: ReferenceFrame

    @field_validator("points")
    @classmethod
    def _valid_polygon(cls, points: list[ZonePoint]) -> list[ZonePoint]:
        check_polygon([(p.x, p.y) for p in points])
        return points

    def area_fraction(self) -> float:
        return polygon_area([(p.x, p.y) for p in self.points])


class WorkerZoneList(BaseModel):
    """What the vision worker receives: every current zone on its camera. The worker uses the enabled ones."""

    camera_id: IdStr
    zones: list[ZoneV1]


def points_from_pairs(pairs: list[tuple[float, float]] | list[list[float]]) -> list[dict[str, float]]:
    """Convert the TOML / worker form [[x, y], ...] to the contract form [{"x": x, "y": y}, ...], same order."""
    return [{"x": float(x), "y": float(y)} for x, y in pairs]


# ---------------------------------------------------------------- polygon geometry
def polygon_area(pts: list[tuple[float, float]]) -> float:
    """Absolute area by the shoelace formula, in frame fractions (1.0 = whole frame)."""
    n = len(pts)
    return abs(sum(pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1] for i in range(n))) / 2


def check_polygon(pts: list[tuple[float, float]]) -> None:
    """Raise ValueError unless pts form a simple polygon (no duplicate points, no crossing, touching or
    overlapping edges) with at least MIN_AREA_FRACTION of the frame."""
    n = len(pts)
    for i in range(n):
        for j in range(i + 1, n):
            if math.dist(pts[i], pts[j]) < DUPLICATE_TOLERANCE:
                raise ValueError(f"points {i} and {j} are duplicate vertices")
    if all(abs(_orient(pts[0], pts[1], p)) <= _EPS for p in pts[2:]):
        raise ValueError("all points lie on one line, so the zone has no area")
    for i in range(n):
        a1, a2 = pts[i], pts[(i + 1) % n]
        for j in range(i + 1, n):
            b1, b2 = pts[j], pts[(j + 1) % n]
            if j == i + 1 or (i == 0 and j == n - 1):
                shared, a_other, b_other = (a2, a1, b2) if j == i + 1 else (a1, a2, b1)
                if _collinear_same_direction(shared, a_other, b_other):
                    raise ValueError(f"edges {i} and {j} overlap (the outline folds back on itself)")
            elif _segments_touch(a1, a2, b1, b2):
                raise ValueError(f"edges {i} and {j} cross or touch; the outline must not cross itself")
    area = polygon_area(pts)
    if area < MIN_AREA_FRACTION:
        raise ValueError(f"zone area is {area:.5f} of the frame; the minimum is {MIN_AREA_FRACTION}")


def _orient(a, b, c) -> float:
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])


def _on_segment(a, b, p) -> bool:
    return min(a[0], b[0]) - _EPS <= p[0] <= max(a[0], b[0]) + _EPS and min(a[1], b[1]) - _EPS <= p[1] <= max(a[1], b[1]) + _EPS


def _segments_touch(a1, a2, b1, b2) -> bool:
    """True if two segments intersect or touch at any point, including collinear overlap."""
    d1, d2, d3, d4 = _orient(b1, b2, a1), _orient(b1, b2, a2), _orient(a1, a2, b1), _orient(a1, a2, b2)
    if ((d1 > _EPS and d2 < -_EPS) or (d1 < -_EPS and d2 > _EPS)) and ((d3 > _EPS and d4 < -_EPS) or (d3 < -_EPS and d4 > _EPS)):
        return True
    return ((abs(d1) <= _EPS and _on_segment(b1, b2, a1)) or (abs(d2) <= _EPS and _on_segment(b1, b2, a2))
            or (abs(d3) <= _EPS and _on_segment(a1, a2, b1)) or (abs(d4) <= _EPS and _on_segment(a1, a2, b2)))


def _collinear_same_direction(shared, p, q) -> bool:
    """Adjacent edges shared->p and shared->q lie on top of each other (a zero-width spike)."""
    if abs(_orient(shared, p, q)) > _EPS:
        return False
    return (p[0] - shared[0]) * (q[0] - shared[0]) + (p[1] - shared[1]) * (q[1] - shared[1]) > 0
