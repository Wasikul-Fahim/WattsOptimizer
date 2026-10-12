"""Login, roles and user management.

Storage: one SQLite table (standard library, parameterised queries only) in users.db.
Passwords: PBKDF2-HMAC-SHA256, 200k rounds, per-user salt. Sessions: a signed cookie
(HMAC-SHA256 over user+role+expiry) — no session table. Roles: admin > secretary > committee.
Login attempts are throttled per username (5 per minute) to blunt password guessing.
"""
import base64
import hashlib
import hmac
import json
import os
import pathlib
import secrets
import sqlite3
import time

from fastapi import APIRouter, HTTPException, Request, Response

ROOT = pathlib.Path(__file__).resolve().parents[1]
DB_PATH = pathlib.Path(os.environ.get("WATTS_DB", ROOT / "users.db"))
SECRET_PATH = ROOT / ".secret"
ROLES = ("admin", "secretary", "committee")
RANK = {r: i for i, r in enumerate(reversed(ROLES))}      # committee=0 < secretary=1 < admin=2
DEMO_PASSWORD = "1234F@him"
SESSION_SECONDS = 12 * 3600
COOKIE = "watts_session"
_attempts: dict = {}                                        # username -> [timestamps]


# --- storage -----------------------------------------------------------------------------
def _db():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def _hash(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)


def init_db() -> None:
    """Create the table and the three demo accounts if they do not exist."""
    with _db() as con:
        con.execute("CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, role TEXT NOT NULL,"
                    " salt BLOB NOT NULL, hash BLOB NOT NULL, created REAL NOT NULL)")
        for role in ROLES:
            if not con.execute("SELECT 1 FROM users WHERE username = ?", (role,)).fetchone():
                add_user(role, DEMO_PASSWORD, role, con)


def add_user(username: str, password: str, role: str, con=None) -> None:
    if not (3 <= len(username) <= 32) or not username.replace("_", "").isalnum():
        raise ValueError("username: 3-32 letters, digits or _")
    if len(password) < 8 or len(password) > 128:
        raise ValueError("password: 8-128 characters")
    if role not in ROLES:
        raise ValueError(f"role: one of {', '.join(ROLES)}")
    salt = secrets.token_bytes(16)
    own = con is None
    con = con or _db()
    try:
        con.execute("INSERT INTO users (username, role, salt, hash, created) VALUES (?, ?, ?, ?, ?)",
                    (username, role, salt, _hash(password, salt), time.time()))
        if own:
            con.commit()
    except sqlite3.IntegrityError:
        raise ValueError("username: already exists")
    finally:
        if own:
            con.close()


def delete_user(username: str) -> bool:
    with _db() as con:
        return con.execute("DELETE FROM users WHERE username = ?", (username,)).rowcount == 1


def list_users() -> list:
    with _db() as con:
        return [dict(r) for r in con.execute("SELECT username, role, created FROM users ORDER BY username")]


def check_password(username: str, password: str) -> "str | None":
    """Role if the credentials are right, else None. Constant-time compare."""
    with _db() as con:
        row = con.execute("SELECT role, salt, hash FROM users WHERE username = ?", (username,)).fetchone()
    if row is None:
        _hash(password, b"x" * 16)                      # same cost whether or not the user exists
        return None
    return row["role"] if hmac.compare_digest(_hash(password, row["salt"]), row["hash"]) else None


# --- sessions ------------------------------------------------------------------------------
def _secret() -> bytes:
    env = os.environ.get("WATTS_SECRET")
    if env:
        return env.encode()
    if not SECRET_PATH.exists():
        SECRET_PATH.write_bytes(secrets.token_bytes(32))
        SECRET_PATH.chmod(0o600)
    return SECRET_PATH.read_bytes()


def make_token(username: str, role: str) -> str:
    body = base64.urlsafe_b64encode(json.dumps(
        {"u": username, "r": role, "exp": int(time.time()) + SESSION_SECONDS}).encode()).decode()
    sig = hmac.new(_secret(), body.encode(), "sha256").hexdigest()
    return f"{body}.{sig}"


def read_token(token: "str | None") -> "dict | None":
    if not token or "." not in token:
        return None
    body, sig = token.rsplit(".", 1)
    if not hmac.compare_digest(hmac.new(_secret(), body.encode(), "sha256").hexdigest(), sig):
        return None
    try:
        data = json.loads(base64.urlsafe_b64decode(body))
    except (ValueError, TypeError):
        return None
    if data.get("exp", 0) < time.time() or data.get("r") not in ROLES:
        return None
    return {"username": data["u"], "role": data["r"]}


def current_user(request: Request) -> "dict | None":
    return read_token(request.cookies.get(COOKIE))


def require(request: Request, role: str = "committee") -> dict:
    """The logged-in user, if their role is at least `role`; else 401/403."""
    user = current_user(request)
    if user is None:
        raise HTTPException(401, "login required")
    if RANK[user["role"]] < RANK[role]:
        raise HTTPException(403, f"{role} role required")
    return user


def _throttled(username: str) -> bool:
    now = time.time()
    hits = [t for t in _attempts.get(username, []) if now - t < 60]
    _attempts[username] = hits
    return len(hits) >= 5


# --- routes --------------------------------------------------------------------------------
router = APIRouter(prefix="/api")


@router.post("/login")
async def login(request: Request, response: Response):
    data = await request.json()
    username, password = str(data.get("username", "")), str(data.get("password", ""))
    if _throttled(username):
        raise HTTPException(429, "too many attempts; wait a minute")
    role = check_password(username, password)
    if role is None:
        _attempts.setdefault(username, []).append(time.time())
        raise HTTPException(401, "wrong username or password")
    response.set_cookie(COOKIE, make_token(username, role), max_age=SESSION_SECONDS,
                        httponly=True, samesite="strict", path="/")
    return {"username": username, "role": role}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(COOKIE, path="/")
    return {"ok": True}


@router.get("/me")
async def me(request: Request):
    return require(request)


@router.get("/users")
async def users(request: Request):
    require(request, "admin")
    return list_users()


@router.post("/users")
async def create_user(request: Request):
    require(request, "admin")
    data = await request.json()
    try:
        add_user(str(data.get("username", "")), str(data.get("password", "")), str(data.get("role", "")))
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"ok": True}


@router.delete("/users/{username}")
async def remove_user(request: Request, username: str):
    me_ = require(request, "admin")
    if username == me_["username"]:
        raise HTTPException(400, "you cannot delete yourself")
    if not delete_user(username):
        raise HTTPException(404, "no such user")
    return {"ok": True}
