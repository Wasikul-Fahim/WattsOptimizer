"""THE decision logic: one exact model over the whole day, solved with OR-Tools CP-SAT.

`solve(inp)` is the single entry point the API uses. It returns
  * a Roster from CP-SAT (proven optimal, `roster.solver == "cp-sat"`), or
  * None when CP-SAT proves no roster can satisfy rules 3–6 (diagnose.py names the conflict), or
  * a Roster from the greedy fallback (`roster.solver == "greedy"`, labelled best-effort) when
    `ortools` cannot be imported or CP-SAT finds nothing within TIME_LIMIT_S.

Model (one boolean per shop per outage hour; at most 12 × 10 = 120 decisions):
  rule 3  capacity      Σ_s kw_s·on[s,h] ≤ capacity                           each outage hour
  rule 4  fuel          one fuel level chosen per outage hour (plus a free "0 kW" level);
                        prev_level_kw < load_h ≤ level_kw; Σ_h litres(level_h) ≤ budget
  rule 5  mandatory     on[s,h] = 1 for mandatory shops
  rule 3  too big       on[s,h] = 0 for a normal shop with kw > capacity
  rule 6  dark runs     for every normal shop and every window of D+1 consecutive hours with
                        no grid hour inside it: Σ_window on[s,h] ≥ 1   (D = 0 → always on)
  rule 7  objective     maximise (budget+1)·Σ value[s,h]·on[s,h] − Σ_h litres_h
                        (ties between equal-value rosters go to the one burning less diesel)
Value and fuel in the output are recomputed from the roster, never read from the model.

`solve_with(inp, force_on=..., soft_dark=...)` re-solves variants of the same model: reasons.py
forces one cell on to measure a trade-off; diagnose.py relaxes rule 6 to find which shops and
hours make an input infeasible.
"""
from . import solver_greedy
from .fuel import HOURS
from .roster import Roster
from .schema import Input

TIME_LIMIT_S = 5.0
# One worker + full LP relaxation (linearization_level=2) proves the twelve-shop sample optimal
# in ~0.1 s and is deterministic; the default single-worker portfolio needed 3–5 s. One worker
# also means a small deployment box (1–2 cores) behaves exactly like the dev machine.
WORKERS = 1
LINEARIZATION = 2


def _build(inp: Input, cp_model, force_on=(), soft_dark=False):
    outage = inp.outage_hours
    m = cp_model.CpModel()
    on = {(s.id, h): m.NewBoolVar(f"on_{s.id}_{h}") for s in inp.shops for h in outage}

    for s in inp.shops:
        for h in outage:
            if s.mandatory:
                m.Add(on[s.id, h] == 1)                                      # rule 5
            elif s.kw > inp.capacity_kw:
                m.Add(on[s.id, h] == 0)                                      # rule 3 (too big)
    for sid, h in force_on:
        m.Add(on[sid, h] == 1)

    levels = ((0, 0),) + tuple(inp.fuel_table)         # (load_kw, centilitres), row 0 = nothing on
    fuel_terms = []
    for h in outage:
        load = sum(s.kw * on[s.id, h] for s in inp.shops)
        m.Add(load <= inp.capacity_kw)                                       # rule 3
        lvl = [m.NewBoolVar(f"lvl_{h}_{k}") for k in range(len(levels))]
        m.AddExactlyOne(lvl)
        m.Add(load == 0).OnlyEnforceIf(lvl[0])                               # rule 4 lookup:
        for k in range(1, len(levels)):                                      # level k <=>
            m.Add(load >= levels[k - 1][0] + 1).OnlyEnforceIf(lvl[k])       # prev_kw < load
            m.Add(load <= levels[k][0]).OnlyEnforceIf(lvl[k])               # ≤ kw_k
        fuel_terms.append(sum(cl * v for (_, cl), v in zip(levels, lvl)))
    total_fuel = sum(fuel_terms)
    m.Add(total_fuel <= inp.budget_cl)                                       # rule 4 budget

    D = inp.max_dark
    slack = {}                                         # (shop, window start) -> violated?
    for s in inp.shops:
        if s.mandatory:
            continue
        for start in range(HOURS - D):                                       # rule 6
            window = range(start, start + D + 1)
            if any(inp.grid[h] for h in window):
                continue                                 # a grid hour resets the run
            cover = sum(on[s.id, h] for h in window)
            if soft_dark:
                slack[s.id, start] = m.NewBoolVar(f"slack_{s.id}_{start}")
                m.Add(cover + slack[s.id, start] >= 1)
            else:
                m.Add(cover >= 1)

    value_weight = inp.budget_cl + 1                   # total fuel ≤ budget, so value always wins
    value = sum(s.value[h] * on[s.id, h] for s in inp.shops for h in outage)
    objective = value_weight * value - total_fuel                            # rule 7
    if slack:                                          # diagnosis: fewest broken windows first
        max_value = sum(s.value[h] for s in inp.shops for h in outage) + 1
        objective -= value_weight * max_value * sum(slack.values())
    m.Maximize(objective)
    return m, on, slack


def _run(m, cp_model):
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = TIME_LIMIT_S
    solver.parameters.num_workers = WORKERS
    solver.parameters.linearization_level = LINEARIZATION
    solver.parameters.random_seed = 1
    return solver, solver.Solve(m)


def _roster(inp, solver, on) -> Roster:
    r = Roster(inp=inp, solver="cp-sat")
    for h in inp.outage_hours:
        r.on[h] = {s.id for s in inp.shops if solver.Value(on[s.id, h])}
    return r


def solve(inp: Input) -> "Roster | None":
    try:
        from ortools.sat.python import cp_model
    except ImportError:                                   # offline machine without the wheel
        return solver_greedy.solve(inp)
    if not inp.outage_hours:
        return Roster(inp=inp, on={}, solver="cp-sat")
    m, on, _ = _build(inp, cp_model)
    solver, status = _run(m, cp_model)
    if status == cp_model.INFEASIBLE:
        return None
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return solver_greedy.solve(inp)                # UNKNOWN / timeout → labelled fallback
    return _roster(inp, solver, on)


def solve_with(inp: Input, force_on=(), soft_dark=False):
    """Variant solve. Returns (roster or None, list of (shop, window_start) rule-6 windows
    that had to be broken). None roster = infeasible, timed out, or no ortools."""
    try:
        from ortools.sat.python import cp_model
    except ImportError:
        return None, []
    m, on, slack = _build(inp, cp_model, force_on=force_on, soft_dark=soft_dark)
    solver, status = _run(m, cp_model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return None, []
    broken = [key for key, v in slack.items() if solver.Value(v)]
    return _roster(inp, solver, on), broken
