"""Zone v1: the JSON Schema, the examples and the API model must agree, and the polygon rules hold.

Invalid cases come from contracts/examples/zone.v1.invalid-cases.json. Each says which layer must
reject it: 'schema' (JSON Schema, and therefore also the model) or 'python' (only the model).
"""

import copy
import json
import math

import jsonschema
import pytest
from pydantic import ValidationError

from app.schemas import zones
from app.schemas.zones import ZoneV1, check_polygon, points_from_pairs, polygon_area

from .conftest import CONTRACTS, load_example

SCHEMA = json.loads((CONTRACTS / "zone.v1.schema.json").read_text(encoding="utf-8"))
VALIDATOR = jsonschema.Draft202012Validator(SCHEMA, format_checker=jsonschema.FormatChecker())
CASES = json.loads((CONTRACTS / "examples" / "zone.v1.invalid-cases.json").read_text(encoding="utf-8"))["cases"]


def valid() -> dict:
    return load_example("zone.v1.json")


def build(case: dict) -> dict:
    zone = valid()
    for key in case.get("remove", []):
        del zone[key]
    zone.update(copy.deepcopy(case.get("set", {})))
    if case.get("generate") == "circle_33":
        zone["points"] = [{"x": 0.5 + 0.3 * math.cos(2 * math.pi * k / 33), "y": 0.5 + 0.3 * math.sin(2 * math.pi * k / 33)} for k in range(33)]
    return zone


def schema_errors(zone: dict) -> list[str]:
    return [e.message for e in VALIDATOR.iter_errors(zone)]


# --- the valid example (Minal's mock data) --------------------------------------------------------------

def test_valid_example_passes_schema_and_model() -> None:
    zone = valid()
    assert schema_errors(zone) == []
    model = ZoneV1.model_validate(zone)
    assert model.zone_id == "zone-south-lawn" and model.version == 1 and len(model.points) == 4
    assert model.area_fraction() > zones.MIN_AREA_FRACTION


def test_model_round_trips_to_the_same_json() -> None:
    zone = valid()
    assert ZoneV1.model_validate(zone).model_dump(mode="json") == {**zone, "reference_frame": {**zone["reference_frame"], "captured_at": "2026-11-18T06:13:47Z"}}


def test_required_fields_match_between_schema_and_model() -> None:
    assert set(SCHEMA["required"]) == {n for n, f in ZoneV1.model_fields.items() if f.is_required()}


def test_documented_polygon_limits_match_the_model() -> None:
    rules = SCHEMA["x-nigahsense-polygon-rules"]
    assert (rules["min_points"], rules["max_points"]) == (zones.MIN_POINTS, zones.MAX_POINTS)
    assert SCHEMA["properties"]["points"]["minItems"] == zones.MIN_POINTS and SCHEMA["properties"]["points"]["maxItems"] == zones.MAX_POINTS
    assert rules["min_area_fraction"] == zones.MIN_AREA_FRACTION and rules["duplicate_tolerance"] == zones.DUPLICATE_TOLERANCE


# --- invalid cases: which layer catches what ------------------------------------------------------------

@pytest.mark.parametrize("case", [c for c in CASES if c["layer"] == "schema"], ids=lambda c: c["name"])
def test_schema_layer_cases_are_rejected_by_both(case) -> None:
    zone = build(case)
    assert schema_errors(zone), "JSON Schema should reject this"
    with pytest.raises(ValidationError):
        ZoneV1.model_validate(zone)


@pytest.mark.parametrize("case", [c for c in CASES if c["layer"] == "python"], ids=lambda c: c["name"])
def test_python_layer_cases_pass_schema_but_fail_the_model(case) -> None:
    zone = build(case)
    assert schema_errors(zone) == [], "this case documents a rule JSON Schema cannot express"
    with pytest.raises(ValidationError) as err:
        ZoneV1.model_validate(zone)
    assert case["expect"] in str(err.value)


@pytest.mark.parametrize("bad", [float("nan"), float("inf"), float("-inf")])
def test_non_finite_coordinates_need_python(bad) -> None:
    """NaN slips through JSON Schema range checks (every comparison with NaN is false); the model rejects it."""
    zone = valid()
    zone["points"][1]["x"] = bad
    if math.isnan(bad):
        assert schema_errors(zone) == []
    with pytest.raises(ValidationError):
        ZoneV1.model_validate(zone)


@pytest.mark.parametrize(("field", "value"), [("enabled", "true"), ("version", "2"), ("version", 1.5)])
def test_model_does_not_coerce_types(field, value) -> None:
    zone = valid()
    zone[field] = value
    assert schema_errors(zone)
    with pytest.raises(ValidationError):
        ZoneV1.model_validate(zone)


def test_text_coordinates_are_rejected() -> None:
    zone = valid()
    zone["points"][0]["x"] = "0.5"
    assert schema_errors(zone)
    with pytest.raises(ValidationError):
        ZoneV1.model_validate(zone)


def test_naive_capture_time_rejected_by_model() -> None:
    zone = valid()
    zone["reference_frame"]["captured_at"] = "2026-11-18T06:13:47"
    with pytest.raises(ValidationError, match="timezone"):
        ZoneV1.model_validate(zone)


# --- polygon geometry -----------------------------------------------------------------------------------

@pytest.mark.parametrize("pts", [
    [(0.1, 0.1), (0.9, 0.1), (0.9, 0.9), (0.1, 0.9)],                                   # square, clockwise on screen
    [(0.1, 0.9), (0.9, 0.9), (0.9, 0.1), (0.1, 0.1)],                                   # same square, other direction
    [(0.0, 0.0), (0.5, 0.0), (0.5, 0.5), (1.0, 0.5), (1.0, 1.0), (0.0, 1.0)],           # concave L touching frame edges
    [(0.1, 0.5), (0.5, 0.2), (0.9, 0.5), (0.5, 0.45)],                                  # concave arrow
])
def test_simple_polygons_pass(pts) -> None:
    check_polygon(pts)


def test_minimum_area_boundary() -> None:
    side = math.sqrt(zones.MIN_AREA_FRACTION)
    check_polygon([(0.5, 0.5), (0.5 + side * 1.01, 0.5), (0.5 + side * 1.01, 0.5 + side * 1.01), (0.5, 0.5 + side * 1.01)])
    with pytest.raises(ValueError, match="area"):
        check_polygon([(0.5, 0.5), (0.5 + side * 0.99, 0.5), (0.5 + side * 0.99, 0.5 + side * 0.99), (0.5, 0.5 + side * 0.99)])


def test_spike_that_folds_back_is_rejected() -> None:
    with pytest.raises(ValueError, match="overlap"):
        check_polygon([(0.1, 0.1), (0.9, 0.1), (0.9, 0.9), (0.5, 0.9), (0.7, 0.9)])


def test_toml_pairs_convert_without_changing_shape() -> None:
    pairs = [[0.00, 0.50], [0.42, 0.63], [0.56, 1.00], [0.00, 1.00]]  # worker/config/worker.example.toml
    pts = points_from_pairs(pairs)
    assert pts == valid()["points"]
    assert polygon_area([(p["x"], p["y"]) for p in pts]) == polygon_area([tuple(p) for p in pairs])
