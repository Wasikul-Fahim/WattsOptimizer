"""'Today's roster': the last roster a secretary computed, kept in memory so committee and
admin screens show it without re-uploading. Lost on restart — fine for a one-day tool."""
import time

from fastapi import APIRouter, Request

from . import auth

router = APIRouter(prefix="/api")
_today: dict = {}


def set_today(user: dict, input_json: dict, output_json: dict) -> None:
    _today.clear()
    _today.update({"by": user["username"], "at": time.time(), "input": input_json,
                   "output": output_json})


@router.get("/today")
async def get_today(request: Request):
    auth.require(request, "committee")
    return _today or {"status": "none"}
