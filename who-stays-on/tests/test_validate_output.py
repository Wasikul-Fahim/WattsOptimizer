import copy
import json
import pathlib
import subprocess
import sys

from fastapi.testclient import TestClient

from app import app
from whostayson.validate_output import check

ROOT = pathlib.Path(__file__).resolve().parents[1]
client = TestClient(app)


def test_api_output_passes_checker(sample, worked):
    for d in (sample, worked):
        out = client.post("/api/roster", json=d).json()
        assert check(d, out) == []


def test_checker_catches_tampering(worked):
    out = client.post("/api/roster", json=worked).json()
    bad = copy.deepcopy(out)
    e = bad["roster"][0]
    moved = e["dark"].pop()
    e["powered"].append(moved["id"])
    assert any("rule" in p for p in check(worked, bad))
    bad = copy.deepcopy(out)
    bad["roster"][0]["dark"][0]["reason"] = ""
    assert any("without a reason" in p for p in check(worked, bad))
    bad = copy.deepcopy(out)
    bad["total_value"] += 1
    assert any("total_value" in p for p in check(worked, bad))


def test_cli_on_committed_outputs():
    inp = ROOT.parent / "Problem Statement" / "sample_input.json"
    out = ROOT / "outputs" / "sample_input.output.json"
    if not out.exists():
        return
    res = subprocess.run([sys.executable, "-m", "whostayson.validate_output", str(inp), str(out)],
                         cwd=ROOT, capture_output=True, text=True)
    assert res.returncode == 0, res.stdout
