"""THE decision logic: one exact model over the whole day, solved with OR-Tools CP-SAT.

`solve(inp)` is the single entry point the API uses. It returns
  * a Roster from CP-SAT (proven optimal, `roster.solver == "cp-sat"`), or
  * None when CP-SAT proves no roster can satisfy rules 3–6 (caller diagnoses the conflict), or
  * a Roster from the greedy fallback (`roster.solver == "greedy"`, labelled best-effort) when
    `ortools` cannot be imported or CP-SAT finds nothing within TIME_LIMIT_S.

Model (one boolean per shop per outage hour; ~12 × 10 = 120 decisions):
  rule 3  capacity      Σ_s kw_s·on[s,h] ≤ capacity                           each outage hour
  rule 4  fuel          one fuel level chosen per outage hour (plus a free "0 kW" level);
                        load_h ≤ load of chosen level; Σ_h litres(level_h) ≤ budget
  rule 5  mandatory     on[s,h] = 1 for mandatory shops
  rule 3  too big       on[s,h] = 0 for a normal shop with kw > capacity
  rule 6  dark runs     for every normal shop and every window of D+1 consecutive hours with
                        no grid hour inside it: Σ_window on[s,h] ≥ 1   (D = 0 → always on)
  rule 7  objective     maximise (budget+1)·Σ value[s,h]·on[s,h] − Σ_h litres_h
                        (ties between equal-value rosters go to the one burning less diesel,
                        which also makes the chosen fuel level the true table lookup)
Value and fuel in the output are recomputed from the roster, never read from the model.
"""
from . import solver_greedy
from .fuel import HOURS
from .roster import Roster
from .schema import Input

TIME_LIMIT_S = 5.0
WORKERS = 8                    # proves the twelve-shop sample optimal in ~0.05 s (5 s single-threaded)


def solve(inp: Input) -> "Roster | None":
    try:
        from ortools.sat.python import cp_model
    except ImportError:                                   # offline machine without the wheel
        return solver_greedy.solve(inp)

    outage = inp.outage_hours
    if not outage:
        return Roster(inp=inp, on={}, solver="cp-sat")

    m = cp_model.CpModel()
    on = {(s.id, h): m.NewBoolVar(f"on_{s.id}_{h}") for s in inp.shops for h in outage}

    for s in inp.shops:
        for h in outage:
            if s.mandatory:
                m.Add(on[s.id, h] == 1)                                      # rule 5
            elif s.kw > inp.capacity_kw:
                m.Add(on[s.id, h] == 0)                                      # rule 3 (too big)

    levels = ((0, 0),) + tuple(inp.fuel_table)         # (load_kw, centilitres), row 0 = nothing on
    fuel_terms = []
    for h in outage:
        load = sum(s.kw * on[s.id, h] for s in inp.shops)
        m.Add(load <= inp.capacity_kw)                                       # rule 3
        lvl = [m.NewBoolVar(f"lvl_{h}_{k}") for k in range(len(levels))]
        m.AddExactlyOne(lvl)
        m.Add(load <= sum(kw * v for (kw, _), v in zip(levels, lvl)))        # rule 4 lookup
        m.Add(load == 0).OnlyEnforceIf(lvl[0])
        for k in range(1, len(levels)):                  # level k <=> prev_kw < load <= kw_k
            m.Add(load >= levels[k - 1][0] + 1).OnlyEnforceIf(lvl[k])       # (channelling; it
            m.Add(load <= levels[k][0]).OnlyEnforceIf(lvl[k])               #  speeds the proof)
        fuel_terms.append(sum(cl * v for (_, cl), v in zip(levels, lvl)))
    total_fuel = sum(fuel_terms)
    m.Add(total_fuel <= inp.budget_cl)                                       # rule 4 budget

    D = inp.max_dark
    for s in inp.shops:
        if s.mandatory:
            continue
        for start in range(HOURS - D):                                       # rule 6
            window = range(start, start + D + 1)
            if any(inp.grid[h] for h in window):
                continue                                 # a grid hour resets the run
            m.Add(sum(on[s.id, h] for h in window) >= 1)

    value_weight = inp.budget_cl + 1                   # total fuel <= budget, so value always wins
    m.Maximize(value_weight * sum(s.value[h] * on[s.id, h] for s in inp.shops for h in outage)
               - total_fuel)                                                 # rule 7

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = TIME_LIMIT_S
    solver.parameters.num_workers = WORKERS
    solver.parameters.random_seed = 1
    status = solver.Solve(m)

    if status == cp_model.INFEASIBLE:
        return None
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return solver_greedy.solve(inp)                # UNKNOWN / timeout → labelled fallback

    r = Roster(inp=inp, solver="cp-sat")
    for h in outage:
        r.on[h] = {s.id for s in inp.shops if solver.Value(on[s.id, h])}
    return r
