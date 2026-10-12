import itertools
import json
import random
import time

import pytest

from whostayson import solver, solver_greedy
from whostayson.roster import Roster
from whostayson.schema import validate


def test_worked_example_84_and_8_litres(worked):
    r = solver.solve(validate(worked))
    assert r.solver == "cp-sat"
    assert r.violations() == []
    assert r.total_value() == 84
    assert r.total_fuel_cl() == 800
    # the brief's roster has loads 9/10/4/10/7/7; equal-value rosters are equally good (rule 7)
    assert sorted(r.load_kw(h) for h in r.inp.outage_hours) == [4, 7, 7, 9, 10, 10]
    assert all(r.is_on("pharmacy", h) for h in r.inp.outage_hours)
    assert all(r.is_on("tea_stall", h) for h in r.inp.outage_hours)
    assert r.is_on("mobile", 8) and r.is_on("mobile", 9)


def test_sample_beats_greedy_and_is_valid(sample):
    inp = validate(sample)
    r = solver.solve(inp)
    assert r.violations() == []
    assert r.total_value() > solver_greedy.solve(inp).total_value()


def brute_force_best(inp):
    """Enumerate every roster for tiny inputs; return the best valid value."""
    outage = inp.outage_hours
    cells = [(s.id, h) for s in inp.shops for h in outage]
    best = None
    for bits in itertools.product((0, 1), repeat=len(cells)):
        r = Roster(inp=inp, on={h: set() for h in outage})
        for (sid, h), b in zip(cells, bits):
            if b:
                r.on[h].add(sid)
        if not r.violations():
            v = r.total_value()
            best = v if best is None else max(best, v)
    return best


def random_input(rng, n_shops, n_outage, hours=10):
    grid = [True] * hours
    for h in rng.sample(range(hours), n_outage):
        grid[h] = False
    cap = rng.randint(6, 20)
    cuts = sorted(rng.sample(range(1, cap), min(2, cap - 1))) + [cap]
    litres, table = 0, []
    for kw in cuts:
        litres += rng.randint(40, 120)
        table.append({"load_kw": kw, "litres_per_hour": litres / 100})
    shops = []
    for i in range(n_shops):
        shops.append({"id": f"s{i}", "kw": rng.randint(1, max(1, cap // 2)),
                      "type": "mandatory" if rng.random() < 0.2 else "normal",
                      "value_per_slot": [rng.randint(0, 8) for _ in range(hours)]})
    return {"grid_available": grid, "generator_capacity_kw": cap,
            "fuel_budget_litres": rng.randint(100, 1200) / 100,
            "fuel_table": table, "max_consecutive_dark": rng.randint(0, 3), "shops": shops}


@pytest.mark.parametrize("seed", range(25))
def test_matches_brute_force_on_tiny_inputs(seed):
    rng = random.Random(seed)
    inp = validate(random_input(rng, n_shops=rng.randint(1, 4), n_outage=rng.randint(1, 4)))
    r = solver.solve(inp)
    expected = brute_force_best(inp)
    if expected is None:
        assert r is None
    else:
        assert r is not None and r.violations() == [] and r.total_value() == expected


@pytest.mark.parametrize("seed", range(30))
def test_twelve_shops_fast_and_valid(seed):
    rng = random.Random(1000 + seed)
    inp = validate(random_input(rng, n_shops=12, n_outage=rng.randint(5, 10)))
    t = time.perf_counter()
    r = solver.solve(inp)
    assert time.perf_counter() - t < 2.0
    if r is not None:
        assert r.solver == "cp-sat" and r.violations() == []


def test_edge_cases(worked):
    d = dict(worked, grid_available=[True] * 10)
    r = solver.solve(validate(d))
    assert r.on == {} and r.total_value() == 0 and r.total_fuel_cl() == 0
    d = dict(worked, shops=[])
    r = solver.solve(validate(d))
    assert r.violations() == [] and r.total_value() == 0
    d = dict(worked, max_consecutive_dark=0)
    r = solver.solve(validate(d))
    assert r is None or all(r.is_on(s.id, h) for s in r.inp.shops for h in r.inp.outage_hours)
    # a normal shop bigger than the generator can never be on (rule 3)...
    mill = {"id": "mill", "kw": 50, "type": "normal", "value_per_slot": [99] * 10}
    big = dict(worked, shops=worked["shops"] + [mill], max_consecutive_dark=3)
    r = solver.solve(validate(big))
    assert r.violations() == [] and not any(r.is_on("mill", h) for h in r.inp.outage_hours)
    same_without_mill = solver.solve(validate(dict(worked, max_consecutive_dark=3)))
    assert r.total_value() == same_without_mill.total_value()
    # ...so with max_consecutive_dark=2 and three-hour outage blocks, rule 6 cannot hold: infeasible
    assert solver.solve(validate(dict(big, max_consecutive_dark=2))) is None


def test_boundary_exact_limits(worked):
    """load == capacity and fuel == budget are allowed (the worked example uses 8.00 of 8.00)."""
    r = solver.solve(validate(worked))
    assert r.total_fuel_cl() == r.inp.budget_cl
    assert max(r.load_kw(h) for h in r.inp.outage_hours) == r.inp.capacity_kw
    tight = dict(worked, fuel_budget_litres=7.99)
    r2 = solver.solve(validate(tight))
    assert r2.violations() == [] and r2.total_fuel_cl() <= 799 and r2.total_value() < 84


def test_forced_fallback_to_greedy(worked, monkeypatch):
    import builtins
    real_import = builtins.__import__

    def fake(name, *a, **k):
        if name.startswith("ortools"):
            raise ImportError("no ortools")
        return real_import(name, *a, **k)
    monkeypatch.setattr(builtins, "__import__", fake)
    r = solver.solve(validate(worked))
    assert r.solver == "greedy"
    assert all(rule not in (3, 4, 5) for rule, _ in r.violations())
