import json
import random
import re

import pytest

from whostayson import reasons, solver, solver_greedy
from whostayson.fuel import fuel_for_load
from whostayson.schema import validate
from tests.test_solver import random_input


def check_truthful(r):
    """Each reason must match the real numbers of the final roster."""
    inp = r.inp
    for h in inp.outage_hours:
        for s in inp.shops:
            if r.is_on(s.id, h):
                assert (s.id, h) not in r.reasons
                continue
            reason = r.reasons[(s.id, h)]
            assert reason and re.search(r"\d", reason), (s.id, h, reason)
            if reason.startswith("needs"):
                assert s.kw > inp.capacity_kw
            elif reason.startswith("worth 0"):
                assert s.value[h] == 0
            elif reason.startswith("capacity"):
                assert r.load_kw(h) + s.kw > inp.capacity_kw
            elif reason.startswith("fuel"):
                extra = fuel_for_load(inp.fuel_table, r.load_kw(h) + s.kw) - r.fuel_cl(h)
                assert r.total_fuel_cl() + extra > inp.budget_cl
            else:
                assert r.solver != "cp-sat", f"optimal roster needed the safety net: {reason}"


def test_sample_reasons_are_truthful(sample):
    r = solver.solve(validate(sample))
    reasons.explain(r)
    check_truthful(r)
    assert all(not s.mandatory for s in r.inp.shops if any((s.id, h) in r.reasons for h in range(10)))


def test_worked_example_reasons(worked):
    r = solver.solve(validate(worked))
    reasons.explain(r)
    check_truthful(r)
    kinds = {v.split(":")[0].split(" ")[0] for v in r.reasons.values()}
    assert kinds <= {"capacity", "fuel", "worth", "needs"}


@pytest.mark.parametrize("seed", range(20))
def test_random_reasons_truthful(seed):
    rng = random.Random(7000 + seed)
    r = solver.solve(validate(random_input(rng, 12, rng.randint(4, 10))))
    if r is not None:
        reasons.explain(r)
        check_truthful(r)


def test_greedy_fallback_reasons_use_safety_net(sample):
    r = solver_greedy.solve(validate(sample))
    reasons.explain(r)
    check_truthful(r)
    assert all(v for v in r.reasons.values())
