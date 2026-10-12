"""Hardening: no DB / no outbound network by construction, bounded input, safe headers."""
import copy
import pathlib

from fastapi.testclient import TestClient

from app import app

client = TestClient(app)
SRC = pathlib.Path(__file__).resolve().parents[1]


def test_security_headers_on_every_response(sample):
    for res in (client.get("/"), client.post("/api/roster", json=sample)):
        assert "script-src 'self'" in res.headers["content-security-policy"]
        assert res.headers["x-content-type-options"] == "nosniff"
        assert res.headers["x-frame-options"] == "DENY"


def test_oversized_body_rejected():
    res = client.post("/api/roster", content=b"[" + b"1," * 40000 + b"1]",
                      headers={"content-type": "application/json"})
    assert res.status_code == 413


def test_long_shop_id_rejected(sample):
    bad = copy.deepcopy(sample)
    bad["shops"][2]["id"] = "x" * 65
    res = client.post("/api/roster", json=bad)
    assert res.status_code == 400 and "shops[2].id" in res.json()["message"]


def test_hostile_id_is_returned_as_plain_data(sample):
    d = copy.deepcopy(sample)
    d["shops"][2]["id"] = "<img src=x onerror=alert(1)>"
    res = client.post("/api/roster", json=d)
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("application/json")


def test_no_database_and_no_outbound_http_in_app_code():
    banned = ("sqlite3", "sqlalchemy", "psycopg", "pymysql", "requests", "urllib.request",
              "httpx", "aiohttp", "socket")
    for f in [SRC / "app.py", *(SRC / "whostayson").glob("*.py")]:
        text = f.read_text()
        for mod in banned:
            assert f"import {mod}" not in text and f"from {mod}" not in text, (f, mod)
