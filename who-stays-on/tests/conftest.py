import copy
import json
import os
import pathlib

import pytest

os.environ.setdefault("WATTS_DB", str(pathlib.Path(__file__).resolve().parent / "_test_users.db"))
os.environ.setdefault("WATTS_SECRET", "test-secret")

ROOT = pathlib.Path(__file__).resolve().parents[1]
SAMPLE = ROOT.parent / "Problem Statement" / "sample_input.json"


@pytest.fixture
def sample():
    return json.loads(SAMPLE.read_text())


@pytest.fixture
def worked():
    """Five-shop worked example from the brief (page 3): optimum value 84, fuel exactly 8.00 L,
    hourly loads 9/10/4/10/7/7 kW over the six outage hours."""
    return {
        "grid_available": [True, True, False, False, False, True, True, False, False, False],
        "generator_capacity_kw": 10,
        "fuel_budget_litres": 8.00,
        "fuel_table": [{"load_kw": 4, "litres_per_hour": 0.80},
                       {"load_kw": 7, "litres_per_hour": 1.20},
                       {"load_kw": 10, "litres_per_hour": 1.60}],
        "max_consecutive_dark": 2,
        "shops": [
            {"id": "pharmacy", "kw": 3, "type": "mandatory", "value_per_slot": [5] * 10},
            {"id": "tailor", "kw": 4, "type": "normal", "value_per_slot": [2, 2, 3, 3, 4, 4, 4, 4, 5, 5]},
            {"id": "mobile", "kw": 3, "type": "normal", "value_per_slot": [1, 1, 2, 2, 2, 3, 4, 6, 8, 8]},
            {"id": "photocopy", "kw": 2, "type": "normal", "value_per_slot": [3, 3, 5, 5, 4, 3, 2, 2, 1, 1]},
            {"id": "tea_stall", "kw": 1, "type": "normal", "value_per_slot": [2, 2, 2, 3, 3, 2, 2, 3, 3, 3]},
        ],
    }


def mutate(d, path, value):
    """Return a deep copy of dict `d` with the JSON-ish `path` (list of keys/indices) set."""
    d = copy.deepcopy(d)
    cur = d
    for k in path[:-1]:
        cur = cur[k]
    cur[path[-1]] = value
    return d
