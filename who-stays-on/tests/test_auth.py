import os
import pathlib

import pytest
from fastapi.testclient import TestClient

from app import app
from whostayson import auth

DB = pathlib.Path(os.environ["WATTS_DB"])


@pytest.fixture(autouse=True)
def fresh_db():
    if DB.exists():
        DB.unlink()
    auth.init_db()
    auth._attempts.clear()
    yield


def login(c, user, pw=auth.DEMO_PASSWORD):
    return c.post("/api/login", json={"username": user, "password": pw})


def test_demo_accounts_and_login():
    c = TestClient(app)
    assert c.get("/api/me").status_code == 401
    assert login(c, "secretary", "wrong").status_code == 401
    res = login(c, "secretary")
    assert res.status_code == 200 and res.json()["role"] == "secretary"
    assert c.get("/api/me").json() == {"username": "secretary", "role": "secretary"}
    c.post("/api/logout")
    assert c.get("/api/me").status_code == 401


def test_passwords_hashed_not_stored():
    with auth._db() as con:
        row = con.execute("SELECT * FROM users WHERE username='admin'").fetchone()
    assert auth.DEMO_PASSWORD.encode() not in row["hash"] and len(row["salt"]) == 16


def test_tampered_cookie_rejected():
    c = TestClient(app)
    login(c, "admin")
    token = c.cookies[auth.COOKIE]
    body, sig = token.rsplit(".", 1)
    c.cookies.set(auth.COOKIE, body + "." + ("0" * len(sig)))
    assert c.get("/api/me").status_code == 401
    forged = auth.make_token("admin", "admin").rsplit(".", 1)[0] + ".bad"
    c.cookies.set(auth.COOKIE, forged)
    assert c.get("/api/me").status_code == 401


def test_role_gates(worked):
    c = TestClient(app)
    login(c, "committee")
    assert c.get("/api/users").status_code == 403
    assert c.post("/api/roster/today", json=worked).status_code == 403
    assert c.get("/api/today").json() == {"status": "none"}
    assert c.post("/api/roster", json=worked).status_code == 200      # raw API stays open

    s = TestClient(app)
    login(s, "secretary")
    assert s.post("/api/roster/today", json=worked).json()["status"] == "ok"
    assert s.get("/api/users").status_code == 403
    t = c.get("/api/today").json()
    assert t["by"] == "secretary" and t["output"]["total_value"] == 84


def test_admin_manages_users():
    a = TestClient(app)
    login(a, "admin")
    assert {u["username"] for u in a.get("/api/users").json()} == {"admin", "secretary", "committee"}
    assert a.post("/api/users", json={"username": "rokeya", "password": "longenough1", "role": "secretary"}).status_code == 200
    assert a.post("/api/users", json={"username": "rokeya", "password": "longenough1", "role": "secretary"}).status_code == 400
    assert a.post("/api/users", json={"username": "x", "password": "longenough1", "role": "secretary"}).status_code == 400
    assert a.post("/api/users", json={"username": "evil", "password": "longenough1", "role": "root"}).status_code == 400
    assert a.post("/api/users", json={"username": "a' OR 1=1 --", "password": "longenough1", "role": "admin"}).status_code == 400
    r = TestClient(app)
    assert login(r, "rokeya", "longenough1").json()["role"] == "secretary"
    assert a.delete("/api/users/admin").status_code == 400
    assert a.delete("/api/users/rokeya").status_code == 200
    assert a.delete("/api/users/rokeya").status_code == 404
    assert login(TestClient(app), "rokeya", "longenough1").status_code == 401


def test_login_throttle():
    c = TestClient(app)
    for _ in range(5):
        assert login(c, "admin", "nope").status_code == 401
    assert login(c, "admin").status_code == 429
