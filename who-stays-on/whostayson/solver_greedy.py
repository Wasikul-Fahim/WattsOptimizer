"""v1: greedy, one outage hour at a time (kept as evidence and as the runtime fallback).

Each hour it powers the mandatory shops, then any normal shop that would otherwise break its
dark-run limit, then the remaining normal shops in order of value for *this hour*, taking each
one if it still fits capacity and the fuel left in the budget. It never looks ahead, so it can
spend the diesel at noon and leave the evening dark — which is exactly the bug the exact
solver (solver.py) fixes (evidence/bug_greedy_runs_dry/: v1 left the pharmacy dark at 19:00).

v2 (this file) adds one guard so it is safe to use as a fallback: before taking a normal shop
it reserves enough diesel to keep the mandatory shops on for every later outage hour, so it
never breaks capacity (3), fuel (4) or mandatory (5). It can still break the dark-run rule
(6) when it cannot afford a shop that rule needs; `Roster.violations()` reports that.
"""
from .fuel import fuel_for_load
from .roster import Roster
from .schema import Input


def solve(inp: Input) -> Roster:
    r = Roster(inp=inp, solver="greedy")
    spent = 0
    run = {s.id: 0 for s in inp.shops}          # current dark run per normal shop
    cap, budget, table = inp.capacity_kw, inp.budget_cl, inp.fuel_table
    mand_kw = sum(s.kw for s in inp.shops if s.mandatory)
    mand_cl = fuel_for_load(table, mand_kw) if mand_kw <= cap else 0

    for h in range(10):
        if inp.grid[h]:
            for sid in run:
                run[sid] = 0
            continue
        on, load = set(), 0
        later = sum(1 for g in inp.outage_hours if g > h)
        reserve = later * mand_cl                      # diesel the mandatory shops still need

        def try_add(s):
            nonlocal load
            new_load = load + s.kw
            if new_load > cap:
                r.reasons[(s.id, h)] = (f"capacity: {load} kW on + {s.kw} kW = {new_load} kW "
                                        f"> {cap} kW")
                return False
            cost = fuel_for_load(table, new_load)
            if spent + cost + (0 if s.mandatory else reserve) > budget:
                r.reasons[(s.id, h)] = (f"fuel: lifting {10 + h}:00 to {new_load} kW costs "
                                        f"{cost / 100:.2f} L; with {reserve / 100:.2f} L kept for "
                                        f"mandatory shops later, {(spent + cost + reserve) / 100:.2f} L "
                                        f"> {budget / 100:.2f} L budget")
                return False
            on.add(s.id)
            load = new_load
            return True

        mandatory = [s for s in inp.shops if s.mandatory]
        normal = [s for s in inp.shops if not s.mandatory]
        for s in mandatory:
            try_add(s)
        must = [s for s in normal if run[s.id] >= inp.max_dark]          # would break rule 6 if dark
        rest = [s for s in normal if run[s.id] < inp.max_dark]
        for s in must + sorted(rest, key=lambda s: (-s.value[h], s.kw, s.id)):
            if s.value[h] == 0 and s not in must:
                r.reasons[(s.id, h)] = f"worth 0 at {10 + h}:00; left off to save diesel"
                continue
            try_add(s)

        r.on[h] = on
        spent += fuel_for_load(table, load)
        for s in normal:
            run[s.id] = 0 if s.id in on else run[s.id] + 1
    return r
