# WattsOptimizer — codebase overview

"Who Stays On?" hackathon entry. Given a market's load-shedding day, decide hour by hour which
shops run on the generator so that every rule holds and the most value is served.

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Language | Python 3.14 | `python3.11` also works |
| Server | FastAPI + uvicorn | One process, `python app.py`, port 8000. Serves the API and the web pages |
| Solver | Google OR-Tools CP-SAT (`whostayson/solver.py`) | One exact model of the whole day; proves the optimum in ~0.1 s for twelve shops |
| Fallback solver | Greedy per hour (`whostayson/solver_greedy.py`) | Labelled best-effort; used only if `ortools` is missing or CP-SAT times out (5 s). Also the "earlier version" in `evidence/` |
| Database | SQLite (Python standard library) | Only for login: one `users` table, PBKDF2-hashed passwords, parameterised queries. Rosters are not stored in a database; each request carries its full input |
| Sessions | Signed cookie | No session table |
| Frontend | Vanilla HTML / CSS / JS in `static/` | No build step, no external scripts or fonts (offline + strict Content-Security-Policy) |
| Tests | pytest (`tests/`) | 153 tests: schema, solver vs brute force, reasons truthfulness, diagnosis, API, auth, security |
| Offline install | `wheels/` + pinned `requirements.txt` | `pip install --no-index --find-links wheels/ -r requirements.txt` |

## Where things live

```
app.py                      start command; FastAPI routes (API, pages)
whostayson/
  schema.py                 rule 9: strict validation -> typed Input or InvalidInput(field, msg)
  fuel.py                   centilitre arithmetic, fuel-table lookup (rule 4)
  roster.py                 the roster object: value, fuel, dark runs, violations() — shared by all
  solver.py                 THE decision logic (CP-SAT model) + solve() dispatcher
  solver_greedy.py          greedy v1/v2: evidence, comparison, runtime fallback
  reasons.py                rule 8: a truthful reason with numbers for every dark cell
  diagnose.py               rule 5: which rule / shops / hours make an input infeasible
  output.py                 the ONLY place that knows the output JSON key names
  validate_output.py        independent checker (CLI): python -m whostayson.validate_output in.json out.json
  auth.py                   login, roles, user management, signed session cookie (SQLite users.db)
  today.py                  today's roster: last one a secretary computed (in memory)
static/                     the screen
tests/                      pytest suite
evidence/                   bug_greedy_runs_dry/ and boundary_exact_limits/ (input, output, NOTE.md)
outputs/                    our outputs on the public inputs (scripts/run_public.sh regenerates)
docs/                       PRD.md, API.md, codebase.md (this file), brief_extracted.txt
```

## Request flow

1. `POST /api/roster` → `schema.validate` (400 naming the field on failure)
2. `solver.solve` → CP-SAT roster, or `None` (proven infeasible), or greedy roster (fallback)
3. `reasons.explain` fills a reason for every dark cell from the final roster
4. infeasible → `diagnose.diagnose` names rule, shops, hours and attaches a labelled best-effort roster
5. `output.to_json` / `output.infeasible_json` — totals recomputed from the roster, never from the solver

## Users and roles

| Role | Who | Can do |
|---|---|---|
| admin | Judges, the team | Everything below, plus add and remove users |
| secretary | Rokeya Apa (market secretary) | Upload or paste input, compute, see the board, reasons, fuel; download JSON; print. Their compute becomes "today's roster" |
| committee | Other market committees | View today's roster; run read-only what-if scenarios on the screen |
| no account | Committees' own tools, judges' hidden inputs | `POST /api/roster` directly — no login required |

Shops have no account: their power is decided by the rules and values in the input.
The generator operator reads the secretary's printed roster (load and fuel per hour).

Accounts: three demo accounts (`admin`, `secretary`, `committee`, password `1234F@him`) are
created on first start and listed in the README. Admins add or remove users through
`/api/users` (the management page comes with the frontend).

## Security measures

- Strict input validation; unknown keys ignored; 64 KB body cap; shop ids ≤ 64 chars
- Content-Security-Policy with no inline or external script, `nosniff`, frame denial
- Shop ids and reasons are rendered as text in the screen, never as HTML (XSS)
- SQL only through parameterised queries on a single SQLite table (SQL injection)
- The server makes no outbound requests and binds to localhost (SSRF: no vector)
- File upload is read in the browser, size- and type-checked, then validated by the server
- Passwords PBKDF2-hashed with per-user salt; sessions are signed HttpOnly SameSite=Strict cookies
- Login throttled to 5 failed attempts per username per minute; CP-SAT has a 5 s time limit
