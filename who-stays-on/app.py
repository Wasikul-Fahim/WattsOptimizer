"""WattsOptimizer ("Who Stays On?") — start with `python app.py`; serves the screen at / and
POST /api/roster on port 8000. Decision logic: whostayson/solver.py (fallback: solver_greedy.py).
Login/roles: whostayson/auth.py. The raw API needs no login; the screens do."""
import json
import pathlib

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from whostayson import auth, diagnose, output, reasons, schema, solver, today

STATIC = pathlib.Path(__file__).parent / "static"
MAX_BODY = 64 * 1024          # bytes; the twelve-shop sample is ~3 KB
app = FastAPI(title="WattsOptimizer", docs_url=None, redoc_url=None, openapi_url=None)
app.include_router(auth.router)
app.include_router(today.router)
auth.init_db()

SECURITY_HEADERS = {
    # No inline/external script, no remote origins: shop ids and reasons can never run as code.
    "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self'; "
                               "script-src 'self'; connect-src 'self'; frame-ancestors 'none'",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
}


@app.middleware("http")
async def harden(request: Request, call_next):
    length = request.headers.get("content-length")
    if length and length.isdigit() and int(length) > MAX_BODY:
        return JSONResponse({"status": "invalid_input", "message": f"body larger than {MAX_BODY} bytes"}, 413)
    response = await call_next(request)
    response.headers.update(SECURITY_HEADERS)
    return response


async def compute(request: Request):
    """Validate + solve; returns (input dict or None, JSONResponse-or-dict)."""
    body = await request.body()
    if len(body) > MAX_BODY:
        return JSONResponse({"status": "invalid_input", "message": f"body larger than {MAX_BODY} bytes"}, 413)
    try:
        data = json.loads(body)
    except ValueError:
        return None, JSONResponse({"status": "invalid_input", "message": "body is not valid JSON"}, 400)
    try:
        inp = schema.validate(data)
    except schema.InvalidInput as e:
        return None, JSONResponse({"status": "invalid_input", "field": e.field,
                                   "message": f"{e.field}: {e.message}"}, 400)
    return data, solve_json(inp)


def solve_json(inp) -> dict:
    r = solver.solve(inp)
    if r is None:                                   # proven infeasible: name the conflict
        conflict, best = diagnose.diagnose(inp)
        reasons.explain(best)
        return output.infeasible_json(inp, conflict, best)
    reasons.explain(r)
    if r.violations():                              # greedy fallback could not meet rule 6
        conflict = {"rule": 6, "shops": [], "hours": [], "message": "fallback solver (exact "
                    "solver unavailable) could not satisfy every rule: " +
                    "; ".join(f"rule {k}: {m}" for k, m in r.violations())}
        return output.infeasible_json(inp, conflict, r)
    return output.to_json(r)


@app.post("/api/roster")                            # open: committees' tools, judges' curl
async def roster(request: Request):
    _, result = await compute(request)
    return result


@app.post("/api/roster/today")                      # secretary: compute AND set today's roster
async def roster_today(request: Request):
    user = auth.require(request, "secretary")
    data, result = await compute(request)
    if data is not None:
        today.set_today(user, data, result)
    return result


@app.get("/")
async def index():
    return FileResponse(STATIC / "index.html")


if STATIC.is_dir():
    app.mount("/static", StaticFiles(directory=STATIC), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
