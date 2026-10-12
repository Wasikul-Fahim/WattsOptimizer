"""Rule 9 — strict input validation. `validate(data)` returns a typed `Input` or raises
`InvalidInput(field, message)`; the API turns that into a 400 naming the field."""
from dataclasses import dataclass
from typing import Any

from .fuel import HOURS, to_centilitres

MAX_SHOPS = 12
MAX_ID_LEN = 64        # keeps output and screen bounded


class InvalidInput(ValueError):
    def __init__(self, field: str, message: str):
        super().__init__(f"{field}: {message}")
        self.field = field
        self.message = message


@dataclass(frozen=True)
class Shop:
    id: str
    kw: int
    mandatory: bool
    value: tuple            # 10 ints


@dataclass(frozen=True)
class Input:
    grid: tuple             # 10 bools, True = grid available
    capacity_kw: int
    budget_cl: int
    fuel_table: tuple       # ((load_kw, centilitres), ...) strictly increasing load
    max_dark: int
    shops: tuple            # Shop, ...

    @property
    def outage_hours(self):
        return [h for h in range(HOURS) if not self.grid[h]]


def _whole(x: Any, field: str, *, minimum: int) -> int:
    """Whole number >= minimum. 3.0 is accepted, 3.5 and True are not."""
    if isinstance(x, bool) or not isinstance(x, (int, float)):
        raise InvalidInput(field, "must be a whole number")
    if isinstance(x, float):
        if x != x or x in (float("inf"), float("-inf")) or not x.is_integer():
            raise InvalidInput(field, "must be a whole number")
        x = int(x)
    if x < minimum:
        raise InvalidInput(field, f"must be >= {minimum}")
    return x


def _litres(x: Any, field: str) -> int:
    if isinstance(x, bool) or not isinstance(x, (int, float)):
        raise InvalidInput(field, "must be a number with at most two decimals")
    try:
        cl = to_centilitres(x)
    except ValueError as e:
        raise InvalidInput(field, str(e))
    if cl < 0:
        raise InvalidInput(field, "must be >= 0")
    return cl


def validate(data: Any) -> Input:
    if not isinstance(data, dict):
        raise InvalidInput("$", "input must be a JSON object")

    for key in ("grid_available", "generator_capacity_kw", "fuel_budget_litres",
                "fuel_table", "max_consecutive_dark", "shops"):
        if key not in data:
            raise InvalidInput(key, "missing")

    grid = data["grid_available"]
    if not isinstance(grid, list) or len(grid) != HOURS:
        raise InvalidInput("grid_available", f"must be a list of exactly {HOURS} booleans")
    for i, g in enumerate(grid):
        if not isinstance(g, bool):
            raise InvalidInput(f"grid_available[{i}]", "must be true or false")

    capacity = _whole(data["generator_capacity_kw"], "generator_capacity_kw", minimum=1)
    budget = _litres(data["fuel_budget_litres"], "fuel_budget_litres")

    table = data["fuel_table"]
    if not isinstance(table, list) or not table:
        raise InvalidInput("fuel_table", "must be a non-empty list")
    rows = []
    prev = 0
    for i, row in enumerate(table):
        f = f"fuel_table[{i}]"
        if not isinstance(row, dict):
            raise InvalidInput(f, "must be an object")
        for k in ("load_kw", "litres_per_hour"):
            if k not in row:
                raise InvalidInput(f"{f}.{k}", "missing")
        kw = _whole(row["load_kw"], f"{f}.load_kw", minimum=1)
        if kw <= prev:
            raise InvalidInput(f"{f}.load_kw", "load_kw must be strictly increasing")
        prev = kw
        rows.append((kw, _litres(row["litres_per_hour"], f"{f}.litres_per_hour")))
    if rows[-1][0] != capacity:
        raise InvalidInput(f"fuel_table[{len(rows) - 1}].load_kw",
                           f"last row must equal generator capacity ({capacity} kW)")

    max_dark = _whole(data["max_consecutive_dark"], "max_consecutive_dark", minimum=0)

    shops_in = data["shops"]
    if not isinstance(shops_in, list):
        raise InvalidInput("shops", "must be a list")
    if len(shops_in) > MAX_SHOPS:
        raise InvalidInput("shops", f"at most {MAX_SHOPS} shops")
    shops = []
    seen = set()
    for i, s in enumerate(shops_in):
        f = f"shops[{i}]"
        if not isinstance(s, dict):
            raise InvalidInput(f, "must be an object")
        for k in ("id", "kw", "type", "value_per_slot"):
            if k not in s:
                raise InvalidInput(f"{f}.{k}", "missing")
        sid = s["id"]
        if not isinstance(sid, str) or not sid.strip():
            raise InvalidInput(f"{f}.id", "must be a non-blank string")
        if len(sid) > MAX_ID_LEN:
            raise InvalidInput(f"{f}.id", f"must be at most {MAX_ID_LEN} characters")
        if sid in seen:
            raise InvalidInput(f"{f}.id", f"duplicate id '{sid}'")
        seen.add(sid)
        kw = _whole(s["kw"], f"{f}.kw", minimum=1)
        if s["type"] not in ("mandatory", "normal"):
            raise InvalidInput(f"{f}.type", "must be 'mandatory' or 'normal'")
        vals = s["value_per_slot"]
        if not isinstance(vals, list) or len(vals) != HOURS:
            raise InvalidInput(f"{f}.value_per_slot", f"must be a list of exactly {HOURS} numbers")
        value = tuple(_whole(v, f"{f}.value_per_slot[{j}]", minimum=0) for j, v in enumerate(vals))
        shops.append(Shop(id=sid, kw=kw, mandatory=(s["type"] == "mandatory"), value=value))

    return Input(grid=tuple(grid), capacity_kw=capacity, budget_cl=budget,
                 fuel_table=tuple(rows), max_dark=max_dark, shops=tuple(shops))
