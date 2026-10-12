# "Who Stays On?" — Plan & PRD

## Context

HackApex hackathon, 3.5 hours. Build a web app + `POST /api/roster` that, given a market's
load-shedding day (10 hourly slots, one generator with a capacity, a diesel budget, a fuel table
by combined load, ≤12 shops with per-hour values), produces an hour-by-hour roster of which
shops are powered, that:

- never exceeds generator capacity in any outage hour,
- never exceeds the diesel budget (fuel = table lookup on the *combined* load, once per hour),
- keeps every mandatory shop on in every outage hour,
- never leaves a normal shop dark more than `max_consecutive_dark` outage hours in a row
  (grid hours and on hours reset the run),
- and, within those rules, maximizes total served value.

Judged on: roster correctness (hidden inputs), value served, robustness (invalid / infeasible /
boundary / the minute-150 update), **a randomly chosen team member explaining it live**, a
working offline app, and verification evidence (a bug you found and fixed + a boundary case).

Source material: `HackApex/Problem Statement/` (brief PDF, judging PDF, `sample_input.json`).
**Missing from the folder**: `schema.md`, `example_output.json`, the practice twelve-shop input
(the sample here *is* a twelve-shop input, probably the same one), and the official validator.
The output serializer must therefore live in one function so it can be matched to `schema.md`
in minutes when the pack arrives.

## Decisions (defaults — override if you disagree)

| Decision | Choice | Why |
|---|---|---|
| Stack | Python 3.11+, FastAPI + uvicorn, vanilla HTML/JS/CSS served by the same process | One start command (`python app.py`), no build step, one process to explain |
| Solver | Exact integer model with OR-Tools CP-SAT (`ortools`), ~120 booleans | Provably optimal, solves in milliseconds, formulation maps 1:1 to the rules so it is easy to explain |
| Solver fallback | The greedy solver (`solver_greedy.py`) **only** — no second exact engine. Used automatically if `ortools` fails to import or CP-SAT returns no solution within its 5 s time limit; the response then carries `"solver": "greedy"` and a visible "best-effort, not proven optimal" banner | One exact formulation to maintain in 3.5 h; the greedy already exists by minute 35, so the fallback is free. A fallback result is never presented as the optimum |
| "Earlier version" for evidence | The same greedy per-hour solver, written first and kept | Honest bug→fix story, a live demo of why the day must be planned as a whole, and it doubles as the runtime fallback |
| Numbers | Litres handled as integer hundredths (centilitres) internally | Rule 4: "whole hundredths, no rounding tolerance" |
| Port | 8000 | Stated in README |

## Repository layout

```
HackApex/who-stays-on/
  app.py                 # start command; FastAPI app, serves /  and POST /api/roster
  whostayson/
    schema.py            # input validation → typed Input or InvalidInput(field, message)
    fuel.py              # fuel level lookup, centilitre helpers
    solver.py            # THE decision logic (CP-SAT model) + solve() dispatcher — README points here
    solver_greedy.py     # v1 greedy: evidence, comparison endpoint, and the runtime fallback
    reasons.py           # one-line reason for every dark cell
    diagnose.py          # infeasibility diagnosis + labelled best-effort roster
    output.py            # roster → output JSON (single place to match schema.md)
    validate_output.py   # independent rule checker (CLI + used in tests)
  static/
    index.html, app.js, style.css   # the screen + print view
  tests/
    test_schema.py, test_solver.py, test_api.py, test_validate_output.py
  evidence/
    bug_greedy_runs_dry/   input.json, output_v1_greedy.json, output_fixed.json, NOTE.md
    boundary_exact_limits/ input.json, output.json, NOTE.md
  outputs/
    sample_input.output.json, update_150.output.json
  scripts/run_public.sh    # posts the public inputs to the API and saves outputs/
  docs/
    PRD.md, ALGORITHM.md, API.md, JUDGE_GUIDE.md
  README.md, requirements.txt, run.sh
```

## PRD

### Users
- Rokeya Apa (market secretary): pastes/uploads today's JSON, reads the board, prints it for
  the generator-room door, downloads the output.
- Other committees: call `POST /api/roster` from their own tools.
- Judges: run hidden inputs against the API; read reasons; interrogate a team member.

### Functional requirements
1. **API** `POST /api/roster`: body = input JSON, response = output JSON.
   200 for `ok` and `infeasible`; 400 for `invalid_input` with `{status, message}` naming the
   field. < 10 s per input (target < 1 s). No internet.
2. **Validation** (rule 9), strict and field-naming. Unknown keys (e.g. `_story` in the sample)
   are ignored. Checks: `grid_available` = exactly 10 booleans (real bools, not 0/1);
   `generator_capacity_kw` positive whole number; `fuel_budget_litres` ≥ 0 with ≤ 2 decimals;
   `fuel_table` non-empty, `load_kw` positive whole numbers strictly increasing, last ==
   capacity, `litres_per_hour` ≥ 0 with ≤ 2 decimals; `max_consecutive_dark` whole number ≥ 0;
   `shops` list, ≤ 12, unique non-blank string ids, `kw` positive whole number, `type` ∈
   {mandatory, normal}, `value_per_slot` exactly 10 whole numbers ≥ 0. Whole numbers given as
   `3.0` are accepted; `3.5` is not.
3. **Solver** (rules 1,3,4,5,6,7): exact optimum. Decision variables `on[s][h]` for every shop
   `s` and outage hour `h`.
   - Mandatory: `on[s][h] = 1`. Normal shop with `kw > capacity`: `on[s][h] = 0`.
   - Capacity: `Σ_s kw_s·on[s][h] ≤ capacity` per outage hour.
   - Fuel: per outage hour one level indicator `lvl[h][k]` per fuel-table row, exactly one chosen
     (plus a "zero load" level costing 0); `Σ_s kw_s·on[s][h] ≤ Σ_k load_k·lvl[h][k]`;
     `Σ_h Σ_k litres_k·lvl[h][k] ≤ budget` (all in centilitres).
   - Dark runs: for every normal shop and every window of `D+1` consecutive *hours* 0..9, with
     grid hours counted as "on": `Σ_{h in window} on[s][h] ≥ 1`. (Grid hours reset the run,
     so windows containing a grid hour are automatically satisfied.) `D = 0` means never dark.
   - Objective: maximize `10000·Σ value[s][h]·on[s][h] − Σ fuel` so equal-value rosters prefer
     less diesel (deterministic, story-friendly). Reported value and fuel are **recomputed from
     the roster**, never read from solver internals.
4. **Reasons** (rule 8) for every dark cell, with numbers, derived *after* solving from the
   final roster. Key insight to tell judges: in an optimal roster a dark normal shop with
   positive value is always blocked by capacity or fuel in that hour (otherwise switching it on
   would be feasible and better). So the reason tree is:
   1. `kw > capacity` → "needs 25 kW, generator carries 20 kW".
   2. `value == 0` this hour → "worth 0 at 14:00; left off to save diesel".
   3. `load_h + kw > capacity` → "capacity: 18 kW on + 4 kW = 22 kW > 20 kW".
   4. else fuel → "fuel: +4 kW lifts 14:00 from the 14 kW to the 20 kW level (+0.80 L); day
      total would be 17.60 L > 17.00 L budget — diesel kept for 18:00–19:00 (mobile 8, restaurant 7)".
      The "kept for" clause names the top-value powered shops in later hours of the day.
   5. Safety net: if none applies (should not happen), re-solve with the cell forced on and
      report the value drop: "trade-off: forcing on costs 3 value elsewhere".
5. **Infeasible** (rule 5): staged diagnosis, each naming rule, shops, hours:
   1. Any mandatory shop `kw > capacity`, or mandatory load > capacity in an outage hour → rule 3/5.
   2. Mandatory-only fuel over all outage hours > budget → rule 4/5.
   3. Full model infeasible → re-solve with dark-run constraints dropped; if that is feasible
      the conflict is rule 6 (list normal shops whose minimum-on requirement cannot fit);
      otherwise rule 4.
   Response: `status: infeasible`, `conflict: {rule, shops, hours, message}`, and
   `best_effort_roster` (labelled) = mandatory-only roster or the relaxed solve.
6. **Screen** (served at `/`, uses the same API):
   - Load JSON by file upload or paste; sample pre-filled; "Compute" button.
   - Roster board split into two visually distinct sections, **Mandatory shops** (★ badge,
     "essential") and **Normal shops**, grouped by the input `type` field — never by name, works
     for any valid input of ≤ 12 shops. One row per shop showing id, kW, type and total dark
     hours; columns 10:00…19:00; ✓ powered / ✗ dark for outage cells, neutral "grid" for grid
     hours (a grid hour is never shown as a decision). Hover shows reason; a list of all ✗
     reasons below. Groups are derived from the API response plus the original shop metadata;
     the frontend never schedules anything itself.
   - Per-hour row under the board: load / capacity, fuel this hour, running total / budget.
   - Summary: status, total value, total fuel, each shop's dark hours; infeasible conflict box.
   - Download output JSON. **What-if panel** (capacity, budget, max_dark, toggle an hour to
     outage) that re-posts to the API — this is the live-evaluation weapon ("predict outcomes
     when constraints change").
   - Print view: `@media print`, A4 landscape, board + load/fuel rows + totals on one page.
7. **Evidence** and **outputs** as in the deliverables; `scripts/run_public.sh` regenerates
   `outputs/` from the API so the minute-150 file is a 30-second job.

### Non-functional
- Offline: dependencies pinned in `requirements.txt`; vendor wheels with
  `pip download -r requirements.txt -d wheels/` before the event so install works offline.
- Deterministic output for the same input (fixed solver seed, single worker).
- Exactly one exact solver. `solve()` in `solver.py` tries CP-SAT (import guarded, 5 s limit)
  and otherwise calls `solver_greedy.solve()`; the output's `solver` field says which ran.
  No scipy/HiGHS/PuLP second formulation — if `ortools` will not install offline, the demo
  runs on greedy and says so rather than on untested code.
- `app.py` ≤ 60 lines; `solver.py` ≤ 150 lines with docstrings naming the rule each constraint
  implements — "find the decision logic in under two minutes".

## Worked-example sanity targets (from the brief)
Five-shop input: optimum value **84**, fuel **8.00 L**, hourly loads 9/10/4/10/7/7 kW.
This becomes the first solver test and the README's walkthrough.

## Execution order (3.5 h budget, with buffer)

| Min | Step |
|---|---|
| 0–15 | Scaffold repo, `requirements.txt`, `schema.py` + tests for every invalid case, `fuel.py` |
| 15–35 | `solver_greedy.py` (per-hour best value, dark-run guard) + `output.py` + `app.py` API. Craft an input where greedy drains the budget by evening / violates something → capture `evidence/bug_greedy_runs_dry/output_v1_greedy.json` |
| 35–75 | `solver.py` CP-SAT model + `solve()` dispatcher; `test_solver.py` (worked example = 84 / 8.00; brute-force cross-check on ≤5-shop random inputs; 12-shop random inputs < 2 s; forced-fallback test: monkeypatch `ortools` import away → greedy result with `solver: "greedy"`) |
| 75–95 | `reasons.py`, `diagnose.py`, `validate_output.py`; infeasible tests; capture fixed evidence output |
| 95–140 | `static/` screen: board, hour rows, reasons, summary, upload/paste/download, what-if panel, print CSS |
| 140–150 | Buffer; run `scripts/run_public.sh` on the sample, commit `outputs/` |
| 150–160 | Minute-150 update: drop file in, rerun script, commit |
| 160–195 | Docs: README, PRD, ALGORITHM, API, JUDGE_GUIDE; boundary evidence; final test run |
| 195–210 | ZIP / push; smoke-test from a clean clone with one command |

## Documentation deliverables
- `README.md`: start command, port, file map ("solver lives in `whostayson/solver.py`"),
  which files the API and screen call, how to run tests, how to regenerate outputs.
- `docs/ALGORITHM.md`: the model in plain words + math, the worked example traced hour by hour,
  why greedy fails (with the evidence input), complexity/timing.
- `docs/API.md`: request/response examples for ok, infeasible, invalid_input.
- `docs/JUDGE_GUIDE.md` (for the randomly picked teammate): a 2-minute explanation script,
  then Q&A cards — "why is X dark at 14:00?", "what happens if capacity drops to 15?",
  "if max_consecutive_dark becomes 1?", "if the budget were unlimited?", "how is fuel
  computed — per shop or combined?", "what if two shops tie?", "what makes an input
  infeasible vs invalid?" — each answered with the rule and a number from the sample output.
  Every teammate reads this before judging.

## Verification
1. `pytest` green: schema (each rule 9 case → 400 naming the field), solver (84/8.00 on the
   worked example; brute-force agreement on small random inputs; capacity, budget, dark-run,
   mandatory never violated on 200 random 12-shop inputs via `validate_output.py`), API
   (status codes), fallback path (`solver: "greedy"` when CP-SAT unavailable), no-outage day → empty roster and zero totals, empty shop list, `D = 0`,
   shop larger than generator, boundary inputs where load == capacity and fuel == budget.
2. `python app.py` then `curl -X POST localhost:8000/api/roster -d @sample_input.json` < 1 s.
3. Open `http://localhost:8000`, load sample, check board, hover reasons, what-if, print
   preview fits one A4 page, download JSON equals API response. Every shop appears exactly
   once, in the section matching its `type`; mandatory rows show ✓ in every outage hour;
   grid hours show "grid"; every ✗ cell has a reason with numbers.
4. Run from a fresh clone with the network off: `pip install --no-index --find-links wheels/
   -r requirements.txt && python app.py`.
5. When `schema.md` / `example_output.json` / official validator arrive: diff our output keys
   against them, adjust `output.py`, run the official validator on `outputs/`.
