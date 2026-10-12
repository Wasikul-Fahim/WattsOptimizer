"""Rule 5: when no roster satisfies every rule, say which rule, which shops and which hours
conflict, and attach a labelled best-effort roster. Staged so the message names the real cause:
  1. a mandatory shop bigger than the generator, or mandatory load over capacity  → rules 3+5
  2. mandatory shops alone burn more than the budget                              → rules 4+5
  3. otherwise the dark-run rule cannot be met: re-solve with rule 6 soft, minimising the
     number of broken windows; the shops/hours of those windows are the conflict → rule 6
"""
from . import solver
from .fuel import SLOT_LABELS, fuel_for_load, litres_str
from .roster import Roster
from .schema import Input


def diagnose(inp: Input) -> tuple:
    """Returns (conflict dict, best_effort Roster)."""
    mandatory = [s for s in inp.shops if s.mandatory]
    outage = inp.outage_hours
    hours = [SLOT_LABELS[h] for h in outage]
    mand_only = Roster(inp=inp, on={h: {s.id for s in mandatory} for h in outage},
                       solver="best-effort")

    too_big = [s for s in mandatory if s.kw > inp.capacity_kw]
    if too_big:
        s = too_big[0]
        return _conflict(3, [s.id], hours, f"mandatory {s.id} needs {s.kw} kW but the generator "
                         f"carries {inp.capacity_kw} kW (rules 3 and 5)"), mand_only
    mand_kw = sum(s.kw for s in mandatory)
    if mand_kw > inp.capacity_kw:
        return _conflict(3, [s.id for s in mandatory], hours,
                         f"mandatory shops alone need {mand_kw} kW > {inp.capacity_kw} kW "
                         f"capacity in every outage hour (rules 3 and 5)"), mand_only
    mand_cl = fuel_for_load(inp.fuel_table, mand_kw) * len(outage)
    if mand_cl > inp.budget_cl:
        return _conflict(4, [s.id for s in mandatory], hours,
                         f"mandatory shops alone burn {litres_str(mand_cl)} L over {len(outage)} "
                         f"outage hours > {litres_str(inp.budget_cl)} L budget (rules 4 and 5)"), mand_only

    relaxed, broken = solver.solve_with(inp, soft_dark=True)
    if relaxed is None:                                   # cannot happen after stages 1–2, but
        return _conflict(6, [s.id for s in inp.shops if not s.mandatory], hours,  # never guess
                         "the dark-run rule (6) cannot be met together with capacity and fuel"), mand_only
    relaxed.solver = "best-effort"
    shops = sorted({sid for sid, _ in broken})
    bad_hours = sorted({h for _, start in broken for h in range(start, start + inp.max_dark + 1)})
    return _conflict(6, shops, [SLOT_LABELS[h] for h in bad_hours],
                     f"{', '.join(shops)} cannot be kept within {inp.max_dark} dark hour(s) in a "
                     f"row during {SLOT_LABELS[bad_hours[0]]}–{SLOT_LABELS[bad_hours[-1]]}: "
                     f"capacity {inp.capacity_kw} kW and {litres_str(inp.budget_cl)} L cannot "
                     f"carry them often enough (rule 6)"), relaxed


def _conflict(rule, shops, hours, message):
    return {"rule": rule, "shops": shops, "hours": hours, "message": message}
