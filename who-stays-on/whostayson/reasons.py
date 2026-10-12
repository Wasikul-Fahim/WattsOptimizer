"""Rule 8: a real reason, with numbers, for every dark cell — derived from the FINAL roster.

Why this is truthful for an optimal roster: if a dark normal shop with positive value could be
switched on in that hour without breaking anything, the roster would not be optimal. Switching
one cell on never hurts rules 5 or 6, so the only possible blockers are, in order:
  1. the shop is bigger than the generator (rule 3),
  2. its value is 0 this hour (nothing to gain, diesel to lose),
  3. the hour's load plus its kW exceeds capacity (rule 3),
  4. the extra diesel for the higher fuel level pushes the day over budget (rule 4) — and we
     say which hours' shops the diesel went to instead,
  5. safety net (only possible for the non-optimal greedy fallback): re-solve with the cell
     forced on and report the trade-off.
"""
from . import solver
from .fuel import SLOT_LABELS, fuel_for_load, litres_str
from .roster import Roster


def explain(r: Roster) -> None:
    inp = r.inp
    shops = {s.id: s for s in inp.shops}
    for h in inp.outage_hours:
        load = r.load_kw(h)
        for s in inp.shops:
            if r.is_on(s.id, h):
                continue
            r.reasons[(s.id, h)] = _reason(r, s, h, load)


def _reason(r: Roster, s, h: int, load: int) -> str:
    inp, t = r.inp, SLOT_LABELS[h]
    if s.mandatory:                                      # only the greedy fallback can do this
        return (f"best-effort roster: the fallback solver could not afford the mandatory "
                f"{s.id} at {t} (rule 5 broken — see status)")
    if s.kw > inp.capacity_kw:
        return f"needs {s.kw} kW, generator carries {inp.capacity_kw} kW (rule 3)"
    if s.value[h] == 0:
        return f"worth 0 at {t}; left off to save diesel"
    new_load = load + s.kw
    if new_load > inp.capacity_kw:
        return (f"capacity: {load} kW on + {s.kw} kW = {new_load} kW > "
                f"{inp.capacity_kw} kW (rule 3)")
    extra = fuel_for_load(inp.fuel_table, new_load) - r.fuel_cl(h)
    total = r.total_fuel_cl() + extra
    if total > inp.budget_cl:
        return (f"fuel: +{s.kw} kW lifts {t} from {load} kW to {new_load} kW "
                f"(+{litres_str(extra)} L); day total would be {litres_str(total)} L > "
                f"{litres_str(inp.budget_cl)} L budget — diesel kept for {_kept_for(r, s, h)}")
    return _trade_off(r, s, h)


def _kept_for(r: Roster, s, h: int) -> str:
    """The best-value powered normal cells elsewhere in the day — where the diesel went."""
    inp = r.inp
    cells = [(o.value[g], o.id, g) for g in inp.outage_hours if g != h
             for o in inp.shops if not o.mandatory and r.is_on(o.id, g) and o.value[g] >= s.value[h]]
    cells.sort(key=lambda c: (-c[0], c[2], c[1]))
    picked, seen = [], set()
    for v, sid, g in cells:                              # best cell of two different shops
        if sid not in seen:
            picked.append(f"{sid} at {SLOT_LABELS[g]} (value {v})")
            seen.add(sid)
        if len(picked) == 2:
            break
    return ", ".join(picked) if picked else "the mandatory shops"


def _trade_off(r: Roster, s, h: int) -> str:
    t = SLOT_LABELS[h]
    forced, _ = solver.solve_with(r.inp, force_on=[(s.id, h)])
    if forced is None:
        return (f"no valid roster can power {s.id} at {t} together with the rules "
                f"on the rest of the day")
    drop = r.total_value() - forced.total_value()
    if drop > 0:
        return f"trade-off: forcing {s.id} on at {t} costs {drop} value elsewhere in the day"
    return (f"best-effort roster ({r.solver} solver): {s.id} at {t} was not chosen; an exact "
            f"solve would gain {-drop} value here")
