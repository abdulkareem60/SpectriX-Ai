"""Today's TOML zones convert to zone contract v1 without changing shape or detection behaviour.

The TOML loader and the entry rule are unchanged; this only proves the conversion path the zone editor
will use (TOML [[x, y]] pairs -> contract [{"x", "y"}] objects) is safe.
"""

from pathlib import Path

import cv2

from nigah_worker.config import load_config
from nigah_worker.zones import Zone

WORKER = Path(__file__).resolve().parents[1]
SAMPLE = WORKER / "samples" / "vtest.avi"


def contract_zone(cfg_zone, camera_id: str, api_zone_module, width: int = 768, height: int = 576) -> dict:
    return {
        "schema_version": "1.0", "camera_id": camera_id, "zone_id": cfg_zone.id, "name": cfg_zone.name or cfg_zone.id,
        "kind": "restricted", "enabled": True, "version": 1,
        "points": api_zone_module.points_from_pairs(cfg_zone.points),
        "reference_frame": {"width": width, "height": height, "captured_at": "2026-11-18T06:13:47Z"},
    }


def test_example_toml_zone_converts_to_a_valid_contract_zone(api_zone_module) -> None:
    cfg = load_config(WORKER / "config" / "worker.example.toml")
    for z in cfg.zones:
        model = api_zone_module.ZoneV1.model_validate(contract_zone(z, cfg.camera.id, api_zone_module))
        assert [(p.x, p.y) for p in model.points] == [tuple(p) for p in z.points]  # same corners, same order


def test_converted_zone_gives_identical_inside_outside_decisions(api_zone_module) -> None:
    cfg = load_config(WORKER / "config" / "worker.example.toml")
    for z in cfg.zones:
        original = Zone(z.id, z.name, tuple(z.points))
        model = api_zone_module.ZoneV1.model_validate(contract_zone(z, cfg.camera.id, api_zone_module))
        converted = Zone(model.zone_id, model.name, tuple((p.x, p.y) for p in model.points))
        grid = [(i / 200, j / 200) for i in range(201) for j in range(201)]  # every 0.5 % of the frame, edges included
        assert [original.contains(*p) for p in grid] == [converted.contains(*p) for p in grid]
        assert api_zone_module.polygon_area(list(converted.points)) == api_zone_module.polygon_area(list(original.points))


def test_example_reference_frame_matches_the_sample_video(api_zone_module) -> None:
    """The contract example (Minal's mock) uses 768 x 576, the size of the frames the worker analyses for vtest.avi."""
    import json

    example = json.loads((WORKER.parent / "contracts" / "examples" / "zone.v1.json").read_text(encoding="utf-8"))
    if SAMPLE.is_file():  # the video is not in Git; check it when present
        cap = cv2.VideoCapture(str(SAMPLE))
        assert (int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))) == (768, 576)
    assert (example["reference_frame"]["width"], example["reference_frame"]["height"]) == (768, 576)
    cfg = load_config(WORKER / "config" / "worker.example.toml")
    assert example["points"] == api_zone_module.points_from_pairs(cfg.zones[0].points)
