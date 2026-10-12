from whostayson import solver_greedy
from whostayson.schema import validate


def test_greedy_sample_never_breaks_capacity_fuel_or_mandatory(sample):
    r = solver_greedy.solve(validate(sample))
    # greedy v2 never breaks rules 3/4/5; a rule-6 break is reported, not hidden
    assert all(rule not in (3, 4, 5) for rule, _ in r.violations())
    assert r.total_fuel_cl() <= 1700


def test_greedy_worked_example_underperforms_or_matches(worked):
    r = solver_greedy.solve(validate(worked))
    assert r.total_value() <= 84
    assert r.total_fuel_cl() <= 800
    for (sid, h), reason in r.reasons.items():
        assert reason
