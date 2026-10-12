import copy

from fastapi.testclient import TestClient

from app import app

client = TestClient(app)


def test_ok(sample):
    res = client.post("/api/roster", json=sample)
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert [e["hour"] for e in body["roster"]] == [2, 3, 4, 5, 7, 8, 9]
    ids = {s["id"] for s in sample["shops"]}
    for e in body["roster"]:
        dark = {d["id"] for d in e["dark"]}
        assert set(e["powered"]) | dark == ids and not set(e["powered"]) & dark
        assert e["load_kw"] <= sample["generator_capacity_kw"]
    assert body["total_fuel_litres"] <= sample["fuel_budget_litres"]


def test_invalid_names_field(sample):
    bad = copy.deepcopy(sample)
    bad["shops"][1]["id"] = "pharmacy"
    res = client.post("/api/roster", json=bad)
    assert res.status_code == 400
    assert res.json()["status"] == "invalid_input"
    assert "shops[1].id" in res.json()["message"]


def test_bad_json():
    res = client.post("/api/roster", content=b"{not json", headers={"content-type": "application/json"})
    assert res.status_code == 400


def test_no_outage_day(sample):
    d = copy.deepcopy(sample)
    d["grid_available"] = [True] * 10
    body = client.post("/api/roster", json=d).json()
    assert body["roster"] == [] and body["total_value"] == 0 and body["total_fuel_litres"] == 0


def test_index():
    assert client.get("/").status_code == 200
