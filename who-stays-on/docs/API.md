# API

One endpoint. No internet needed, no auth needed for direct calls (the screen uses a session).

## `POST /api/roster`

Request body: the input JSON exactly as `schema.md` / the brief define it (the public
`sample_input.json` is a valid body). Max body 64 KB. Response is always JSON.

| Case | HTTP | `status` |
|---|---|---|
| valid input, a roster satisfies every rule | 200 | `ok` |
| valid input, no roster can satisfy the rules | 200 | `infeasible` |
| input does not match the format | 400 | `invalid_input` |
| body larger than 64 KB | 413 | `invalid_input` |

```bash
curl -s -X POST http://127.0.0.1:8000/api/roster \
     -H 'content-type: application/json' --data-binary @sample_input.json
```

### `ok` (worked example from the brief: value 84, fuel 8.00 L)

Hours that have grid power are **not** in `roster` (nothing is decided there). Every outage
hour appears once; `powered` + `dark` are exactly the shop ids. Every dark entry carries the real
reason with numbers. `total_value`, `total_fuel_litres` and `dark_hours` are recomputed from the
roster. `solver` is `cp-sat` (proven optimal) or `greedy` (labelled fallback, best effort).

```json
{
  "status": "ok",
  "total_value": 84,
  "total_fuel_litres": 8.0,
  "fuel_budget_litres": 8.0,
  "roster": [
    {
      "hour": 2,
      "time": "12:00",
      "powered": [
        "pharmacy",
        "photocopy",
        "tea_stall"
      ],
      "dark": [
        {
          "id": "tailor",
          "reason": "fuel: +4 kW lifts 12:00 from 6 kW to 10 kW (+0.40 L); day total would be 8.40 L > 8.00 L budget \u2014 diesel kept for mobile at 18:00 (value 8), photocopy at 13:00 (value 5)"
        },
        {
          "id": "mobile",
          "reason": "fuel: +3 kW lifts 12:00 from 6 kW to 9 kW (+0.40 L); day total would be 8.40 L > 8.00 L budget \u2014 diesel kept for mobile at 18:00 (value 8), photocopy at 13:00 (value 5)"
        }
      ],
      "load_kw": 6,
      "fuel_litres": 1.2,
      "value": 12
    },
    {
      "hour": 3,
      "time": "13:00",
      "powered": [
        "pharmacy",
        "tailor",
        "photocopy",
        "tea_stall"
      ],
      "dark": [
        {
          "id": "mobile",
          "reason": "capacity: 10 kW on + 3 kW = 13 kW > 10 kW (rule 3)"
        }
      ],
      "load_kw": 10,
      "fuel_litres": 1.6,
      "value": 16
    },
    "... one entry per outage hour ..."
  ],
  "shops": [
    {
      "id": "pharmacy",
      "kw": 3,
      "type": "mandatory",
      "dark_hours": 0
    },
    {
      "id": "tailor",
      "kw": 4,
      "type": "normal",
      "dark_hours": 4
    },
    {
      "id": "mobile",
      "kw": 3,
      "type": "normal",
      "dark_hours": 3
    },
    {
      "id": "photocopy",
      "kw": 2,
      "type": "normal",
      "dark_hours": 3
    },
    {
      "id": "tea_stall",
      "kw": 1,
      "type": "normal",
      "dark_hours": 0
    }
  ],
  "grid_available": [
    true,
    true,
    false,
    false,
    false,
    true,
    true,
    false,
    false,
    false
  ],
  "solver": "cp-sat"
}
```

### `infeasible` (same input with `max_consecutive_dark: 0`)

`conflict` names the rule, the shops and the hours. `best_effort_roster` is attached but
labelled: `best_effort_note` lists what it breaks.

```json
{
  "status": "infeasible",
  "total_value": 90,
  "total_fuel_litres": 8.0,
  "fuel_budget_litres": 8.0,
  "shops": [
    {
      "id": "pharmacy",
      "kw": 3,
      "type": "mandatory",
      "dark_hours": 0
    },
    {
      "id": "tailor",
      "kw": 4,
      "type": "normal",
      "dark_hours": 4
    },
    {
      "id": "mobile",
      "kw": 3,
      "type": "normal",
      "dark_hours": 3
    },
    {
      "id": "photocopy",
      "kw": 2,
      "type": "normal",
      "dark_hours": 3
    },
    {
      "id": "tea_stall",
      "kw": 1,
      "type": "normal",
      "dark_hours": 0
    }
  ],
  "grid_available": [
    true,
    true,
    false,
    false,
    false,
    true,
    true,
    false,
    false,
    false
  ],
  "conflict": {
    "rule": 6,
    "shops": [
      "mobile",
      "photocopy",
      "tailor"
    ],
    "hours": [
      "12:00",
      "13:00",
      "14:00",
      "17:00",
      "18:00",
      "19:00"
    ],
    "message": "mobile, photocopy, tailor cannot be kept within 0 dark hour(s) in a row during 12:00\u201319:00: capacity 10 kW and 8.00 L cannot carry them often enough (rule 6)"
  },
  "best_effort_roster": [
    {
      "hour": 2,
      "time": "12:00",
      "powered": [
        "pharmacy",
        "photocopy",
        "tea_stall"
      ],
      "dark": [
        {
          "id": "tailor",
          "reason": "fuel: +4 kW lifts 12:00 from 6 kW to 10 kW (+0.40 L); day total would be 8.40 L > 8.00 L budget \u2014 diesel kept for mobile at 18:00 (value 8), photocopy at 13:00 (value 5)"
        },
        {
          "id": "mobile",
          "reason": "fuel: +3 kW lifts 12:00 from 6 kW to 9 kW (+0.40 L); day total would be 8.40 L > 8.00 L budget \u2014 diesel kept for mobile at 18:00 (value 8), photocopy at 13:00 (value 5)"
        }
      ],
      "load_kw": 6,
      "fuel_litres": 1.2,
      "value": 12
    },
    {
      "hour": 3,
      "time": "13:00",
      "powered": [
        "pharmacy",
        "tailor",
        "photocopy",
        "tea_stall"
      ],
      "dark": [
        {
          "id": "mobile",
          "reason": "capacity: 10 kW on + 3 kW = 13 kW > 10 kW (rule 3)"
        }
      ],
      "load_kw": 10,
      "fuel_litres": 1.6,
      "value": 16
    },
    "... one entry per outage hour ..."
  ],
  "best_effort_note": "not a valid roster: rule 6: 'tailor' dark 3 hours in a row > 0; rule 6: 'mobile' dark 3 hours in a row > 0; rule 6: 'photocopy' dark 3 hours in a row > 0"
}
```

### `invalid_input` (duplicate shop id) — HTTP 400

```json
{
  "status": "invalid_input",
  "field": "shops[1].id",
  "message": "shops[1].id: duplicate id 'pharmacy'"
}
```

## What-if from the screen

There is no separate endpoint. The screen edits the input (capacity, budget,
`max_consecutive_dark`, or flipping a grid hour to an outage) and re-posts it to `/api/roster`.

## Field reference for the frontend

- `roster[i].hour` 0–9 (0 = 10:00), `roster[i].time` "12:00"
- `roster[i].load_kw`, `roster[i].fuel_litres`, `roster[i].value` — that hour only
- `shops[i]` = id, kw, type (`mandatory` | `normal`), dark_hours — group rows by `type`
- `grid_available` echoes the input so the board can draw "grid" cells
