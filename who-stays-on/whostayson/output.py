"""Roster -> output JSON. The ONLY place that knows the output key names, so matching
schema.md / example_output.json when they arrive is a change to this one function."""
from .fuel import HOURS, SLOT_LABELS, litres_float
from .roster import Roster


def to_json(r: Roster, status: str = "ok") -> dict:
    inp = r.inp
    hours = []
    for h in inp.outage_hours:
        on = r.on.get(h, set())
        hours.append({
            "hour": h,
            "time": SLOT_LABELS[h],
            "powered": [s.id for s in inp.shops if s.id in on],
            "dark": [{"id": s.id, "reason": r.reasons.get((s.id, h), "")}
                     for s in inp.shops if s.id not in on],
            "load_kw": r.load_kw(h),
            "fuel_litres": litres_float(r.fuel_cl(h)),
            "value": r.value(h),
        })
    return {
        "status": status,
        "total_value": r.total_value(),
        "total_fuel_litres": litres_float(r.total_fuel_cl()),
        "fuel_budget_litres": litres_float(inp.budget_cl),
        "roster": hours,
        "shops": [{"id": s.id, "kw": s.kw, "type": "mandatory" if s.mandatory else "normal",
                   "dark_hours": r.dark_hours(s.id)} for s in inp.shops],
        "grid_available": list(inp.grid),
        "solver": r.solver,
    }


def infeasible_json(inp, conflict: dict, best_effort: Roster) -> dict:
    """Rule 5: name the rule/shops/hours in conflict and attach a labelled best-effort roster."""
    body = to_json(best_effort, status="infeasible")
    body["conflict"] = conflict
    body["best_effort_roster"] = body.pop("roster")
    body["best_effort_note"] = ("not a valid roster: " + "; ".join(
        f"rule {rule}: {msg}" for rule, msg in best_effort.violations()))
    body.pop("solver", None)
    return body
