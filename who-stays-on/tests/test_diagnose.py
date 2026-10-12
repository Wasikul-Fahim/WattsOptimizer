from fastapi.testclient import TestClient

from app import app
from whostayson import diagnose, solver
from whostayson.schema import validate

client = TestClient(app)


def test_mandatory_too_big(worked):
    d = dict(worked, shops=[dict(worked["shops"][0], kw=11)] + worked["shops"][1:])
    assert solver.solve(validate(d)) is None
    conflict, best = diagnose.diagnose(validate(d))
    assert conflict["rule"] == 3 and conflict["shops"] == ["pharmacy"] and len(conflict["hours"]) == 6


def test_mandatory_fuel_over_budget(worked):
    d = dict(worked, fuel_budget_litres=4.79)      # pharmacy needs 6 x 0.80 = 4.80
    inp = validate(d)
    assert solver.solve(inp) is None
    conflict, best = diagnose.diagnose(inp)
    assert conflict["rule"] == 4 and "4.80" in conflict["message"]
    assert all(best.is_on("pharmacy", h) for h in inp.outage_hours)


def test_dark_run_conflict_names_shops_and_hours(worked):
    d = dict(worked, max_consecutive_dark=0)      # everyone on every hour: 13 kW > 10 kW
    inp = validate(d)
    assert solver.solve(inp) is None
    conflict, best = diagnose.diagnose(inp)
    assert conflict["rule"] == 6 and conflict["shops"] and conflict["hours"]
    assert all(best.is_on("pharmacy", h) for h in inp.outage_hours)
    assert best.total_fuel_cl() <= inp.budget_cl


def test_api_infeasible_response(worked):
    d = dict(worked, max_consecutive_dark=0)
    res = client.post("/api/roster", json=d)
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "infeasible"
    assert body["conflict"]["rule"] == 6
    assert body["best_effort_roster"] and body["best_effort_note"].startswith("not a valid roster")
    assert "roster" not in body
