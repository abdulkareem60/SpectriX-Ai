"""Zone endpoints: save, read, update with versions, stale edits, validation and role permissions."""

import copy
import json

import pytest

from .conftest import ADMIN, CONTRACTS, OPERATOR, SUPERVISOR, WORKER, load_example

URL = "/v1/cameras/cam-demo-plaza/zones/zone-south-lawn"
CASES = json.loads((CONTRACTS / "examples" / "zone.v1.invalid-cases.json").read_text(encoding="utf-8"))["cases"]


def zone(**changes) -> dict:
    z = load_example("zone.v1.json")
    z.update(changes)
    return z


def put(client, body, headers=SUPERVISOR, url=URL):
    return client.put(url, json=body, headers=headers)


# --- save and read ----------------------------------------------------------------------------------

def test_create_then_read_returns_the_same_zone(client) -> None:
    r = put(client, zone())
    assert r.status_code == 201
    assert r.json() == zone()
    got = client.get(URL, headers=OPERATOR)
    assert got.status_code == 200
    assert got.json() == zone()  # same points, same order, same values


def test_update_saves_next_version_and_keeps_the_old_one(client, zone_repo) -> None:
    put(client, zone())
    moved = zone(version=2, points=[{"x": 0.0, "y": 0.6}, {"x": 0.5, "y": 0.7}, {"x": 0.6, "y": 1.0}, {"x": 0.0, "y": 1.0}])
    r = put(client, moved)
    assert r.status_code == 200 and r.json()["version"] == 2
    assert client.get(URL, headers=OPERATOR).json() == moved
    assert zone_repo.get_version("cam-demo-plaza", "zone-south-lawn", 1).model_dump(mode="json") == zone()
    assert zone_repo.get_version("cam-demo-plaza", "zone-south-lawn", 2).model_dump(mode="json") == moved


def test_admin_can_save_too(client) -> None:
    assert put(client, zone(), headers=ADMIN).status_code == 201


def test_disabling_is_a_normal_versioned_save(client) -> None:
    put(client, zone())
    r = put(client, zone(version=2, enabled=False))
    assert r.status_code == 200 and client.get(URL, headers=OPERATOR).json()["enabled"] is False


# --- stale versions -----------------------------------------------------------------------------------

@pytest.mark.parametrize(("stored_versions", "sent", "current"), [
    (0, 2, 0),   # new zone must start at version 1
    (1, 1, 1),   # saving version 1 again (someone else already created it)
    (2, 2, 2),   # stale edit: another person saved version 2 first
    (1, 3, 1),   # skipping a version
])
def test_wrong_version_is_rejected_and_nothing_changes(client, stored_versions, sent, current) -> None:
    for v in range(1, stored_versions + 1):
        assert put(client, zone(version=v, name=f"Saved v{v}")).status_code in (200, 201)
    before = client.get(URL, headers=OPERATOR).json() if stored_versions else None
    r = put(client, zone(version=sent, name="Stale edit"))
    assert r.status_code == 409
    err = r.json()["error"]
    assert err["code"] == "version_conflict"
    assert err["details"] == {"current_version": current, "expected_version": current + 1}
    after = client.get(URL, headers=OPERATOR)
    assert (after.json() if stored_versions else after.status_code) == (before if stored_versions else 404)


# --- validation ---------------------------------------------------------------------------------------

@pytest.mark.parametrize("case", CASES, ids=lambda c: c["name"])
def test_invalid_zones_are_rejected_with_the_standard_error(client, case) -> None:
    body = zone()
    for key in case.get("remove", []):
        del body[key]
    body.update(copy.deepcopy(case.get("set", {})))
    if case.get("generate") == "circle_33":
        import math
        body["points"] = [{"x": 0.5 + 0.3 * math.cos(2 * math.pi * k / 33), "y": 0.5 + 0.3 * math.sin(2 * math.pi * k / 33)} for k in range(33)]
    r = put(client, body)
    assert r.status_code == 422
    err = r.json()["error"]
    assert err["code"] == "validation_error"
    if "expect" in case:
        assert case["expect"] in json.dumps(err["details"])
    assert client.get(URL, headers=OPERATOR).status_code == 404  # nothing was saved


def test_url_and_body_must_match(client) -> None:
    r = put(client, zone(zone_id="zone-other"))
    assert r.status_code == 422 and r.json()["error"]["code"] == "path_body_mismatch"
    r = put(client, zone(), url="/v1/cameras/cam-other/zones/zone-south-lawn")
    assert r.status_code == 422 and r.json()["error"]["code"] == "path_body_mismatch"


@pytest.mark.parametrize("url", ["/v1/cameras/Cam%20A/zones/zone-south-lawn", "/v1/cameras/cam-demo-plaza/zones/ZONE"])
def test_invalid_ids_in_url_are_rejected(client, url) -> None:
    assert client.get(url, headers=OPERATOR).status_code == 422
    assert put(client, zone(), url=url).status_code == 422


def test_unknown_zone_is_404(client) -> None:
    r = client.get(URL, headers=OPERATOR)
    assert r.status_code == 404 and r.json()["error"]["code"] == "zone_not_found"


# --- permissions --------------------------------------------------------------------------------------

@pytest.mark.parametrize(("headers", "status", "code"), [
    ({}, 401, "unauthenticated"),
    ({"Authorization": "Bearer not-a-real-token"}, 401, "invalid_token"),
    (WORKER, 401, "unauthenticated"),                                  # the worker key never edits zones
    (OPERATOR, 403, "forbidden"),                                       # operators can read, not edit
    ({"Authorization": "Bearer viewer-token"}, 403, "forbidden"),
])
def test_only_supervisors_and_admins_can_save(client, headers, status, code) -> None:
    r = put(client, zone(), headers=headers)
    assert r.status_code == status and r.json()["error"]["code"] == code
    assert client.get(URL, headers=OPERATOR).status_code == 404


@pytest.mark.parametrize(("headers", "status"), [(OPERATOR, 200), (SUPERVISOR, 200), (ADMIN, 200), ({}, 401), (WORKER, 401),
                                                 ({"Authorization": "Bearer viewer-token"}, 403)])
def test_reading_needs_an_operator_role(client, headers, status) -> None:
    put(client, zone())
    assert client.get(URL, headers=headers).status_code == status


def test_editor_roles_are_configurable(client, settings) -> None:
    settings.zone_editor_roles = "admin"
    assert put(client, zone(), headers=SUPERVISOR).status_code == 403
    assert put(client, zone(), headers=ADMIN).status_code == 201


def test_editor_role_must_also_be_an_operator_role(client, settings) -> None:
    settings.zone_editor_roles = "supervisor,viewer"
    assert put(client, zone(), headers={"Authorization": "Bearer viewer-token"}).status_code == 403


# --- worker read endpoint -----------------------------------------------------------------------------

WORKER_URL = "/v1/worker/cameras/cam-demo-plaza/zones"


def test_worker_gets_current_zones_of_its_camera_only(client) -> None:
    put(client, zone())
    put(client, zone(version=2, points=[{"x": 0.1, "y": 0.6}, {"x": 0.5, "y": 0.7}, {"x": 0.6, "y": 1.0}, {"x": 0.1, "y": 1.0}]))
    put(client, zone(zone_id="zone-a-door", name="Door", enabled=False), url="/v1/cameras/cam-demo-plaza/zones/zone-a-door")
    put(client, zone(camera_id="cam-other"), url="/v1/cameras/cam-other/zones/zone-south-lawn")
    r = client.get(WORKER_URL, headers=WORKER)
    assert r.status_code == 200
    body = r.json()
    assert body["camera_id"] == "cam-demo-plaza"
    assert [(z["zone_id"], z["version"], z["enabled"]) for z in body["zones"]] == [("zone-a-door", 1, False), ("zone-south-lawn", 2, True)]


def test_worker_gets_empty_list_for_camera_without_zones(client) -> None:
    r = client.get("/v1/worker/cameras/cam-unknown/zones", headers=WORKER)
    assert r.status_code == 200 and r.json() == {"camera_id": "cam-unknown", "zones": []}


@pytest.mark.parametrize(("headers", "status", "code"), [({}, 401, "invalid_worker_key"), ({"X-Worker-Key": "wrong"}, 401, "invalid_worker_key"),
                                                         (OPERATOR, 401, "invalid_worker_key"), (ADMIN, 401, "invalid_worker_key")])
def test_worker_endpoint_needs_the_worker_key(client, headers, status, code) -> None:
    r = client.get(WORKER_URL, headers=headers)
    assert r.status_code == status and r.json()["error"]["code"] == code


def test_worker_endpoint_disabled_without_configured_keys(client, settings) -> None:
    from pydantic import SecretStr

    settings.worker_api_keys = SecretStr("")
    assert client.get(WORKER_URL, headers=WORKER).status_code == 503
