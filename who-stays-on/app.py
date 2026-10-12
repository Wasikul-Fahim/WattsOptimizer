"""Who Stays On? — start with `python app.py`; serves the screen at / and POST /api/roster
on port 8000. Decision logic lives in whostayson/solver.py (fallback: solver_greedy.py)."""
import json
import pathlib

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from whostayson import output, schema
from whostayson import solver

STATIC = pathlib.Path(__file__).parent / "static"
MAX_BODY = 64 * 1024          # bytes; the twelve-shop sample is ~3 KB
app = FastAPI(title="Who Stays On?", docs_url=None, redoc_url=None, openapi_url=None)

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


@app.post("/api/roster")
async def roster(request: Request):
    body = await request.body()
    if len(body) > MAX_BODY:
        return JSONResponse({"status": "invalid_input", "message": f"body larger than {MAX_BODY} bytes"}, 413)
    try:
        data = json.loads(body)
    except ValueError:
        return JSONResponse({"status": "invalid_input", "message": "body is not valid JSON"}, 400)
    try:
        inp = schema.validate(data)
    except schema.InvalidInput as e:
        return JSONResponse({"status": "invalid_input", "field": e.field,
                             "message": f"{e.field}: {e.message}"}, 400)
    r = solver.solve(inp)
    if r is None:                                   # TODO step 4: diagnose.py names the conflict
        return {"status": "infeasible", "conflict": {"message": "no roster satisfies rules 3-6"}}
    return output.to_json(r, status="ok" if not r.violations() else "infeasible")


@app.get("/")
async def index():
    return FileResponse(STATIC / "index.html")


if STATIC.is_dir():
    app.mount("/static", StaticFiles(directory=STATIC), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
