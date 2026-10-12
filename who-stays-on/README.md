# WattsOptimizer — "Who Stays On?"

Decides, hour by hour, which shops in a market run on the generator during load shedding, so
that no rule is ever broken and the most value is served across the whole day.

## Start

```bash
cd who-stays-on
python3 -m venv .venv
.venv/bin/pip install --no-index --find-links wheels/ -r requirements.txt   # offline, from vendored wheels
.venv/bin/python app.py
```

Serves on **http://127.0.0.1:8000**: the screen at `/` and the API at `POST /api/roster`.
No internet is needed at runtime.

## Demo accounts

Created automatically on first start. All three use the same password.

| Username | Role | Password |
|---|---|---|
| `admin` | admin (judges, team) | `1234F@him` |
| `secretary` | secretary (Rokeya Apa) | `1234F@him` |
| `committee` | committee | `1234F@him` |

| Role | Can do |
|---|---|
| admin | everything below, plus add and remove users |
| secretary | upload or paste input, compute, set today's roster, download, print |
| committee | view today's roster, run read-only what-if scenarios |
| no account | `POST /api/roster` directly — the raw API needs no login |

## Where the decision logic lives

**`whostayson/solver.py`** — one exact OR-Tools CP-SAT model of the whole day, with one docstring
line per rule. If `ortools` is missing or CP-SAT times out (5 s), it falls back to
`whostayson/solver_greedy.py` and labels the result `"solver": "greedy"`.

| File | Job |
|---|---|
| `app.py` | start command; routes |
| `whostayson/schema.py` | input validation (rule 9), names the bad field |
| `whostayson/reasons.py` | a truthful reason, with numbers, for every dark cell (rule 8) |
| `whostayson/diagnose.py` | which rule, shops and hours make an input infeasible (rule 5) |
| `whostayson/output.py` | the only place that knows the output JSON key names |
| `whostayson/auth.py` | login, roles, user management (SQLite) |
| `whostayson/validate_output.py` | independent rule checker |

More detail in `docs/codebase.md`. Request and response examples in `docs/API.md`.

## API

| Endpoint | Login | Purpose |
|---|---|---|
| `POST /api/roster` | none | input JSON in, roster JSON out |
| `POST /api/roster/today` | secretary | same, and stores it as today's roster |
| `GET /api/today` | committee | today's roster |
| `POST /api/login`, `POST /api/logout`, `GET /api/me` | — | session |
| `GET/POST /api/users`, `DELETE /api/users/{name}` | admin | user management |

The screen calls `/api/login`, `/api/me`, `/api/roster/today`, `/api/today` and `/api/roster`.

```bash
curl -s -X POST http://127.0.0.1:8000/api/roster \
     -H 'content-type: application/json' --data-binary @"../Problem Statement/sample_input.json"
```

## Tests and checks

```bash
.venv/bin/python -m pytest -q                                                    # full suite
.venv/bin/python -m whostayson.validate_output input.json output.json            # check any output
scripts/run_public.sh                                                            # regenerate outputs/ (app must be running)
```

## Results on the public inputs

| Input | Status | Value | Fuel |
|---|---|---|---|
| Worked example (brief) | ok | 84 | 8.00 L of 8.00 |
| `sample_input.json` | ok | 186 | 16.40 L of 17.00 |

## Evidence

- `evidence/bug_greedy_runs_dry/` — the per-hour greedy spent the diesel by 18:00 and left the
  pharmacy dark at 19:00; the whole-day model fixes it.
- `evidence/boundary_exact_limits/` — load exactly at capacity and fuel exactly at budget.

## Security

Strict validation, 64 KB body cap, Content-Security-Policy with no external or inline script,
parameterised SQL only, PBKDF2 password hashes, signed HttpOnly SameSite cookies, login throttling,
no outbound network calls. Details in `docs/codebase.md`.
