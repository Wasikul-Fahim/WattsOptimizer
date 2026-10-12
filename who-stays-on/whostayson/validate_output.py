"""Independent rule checker: reads the INPUT and OUTPUT JSON files and re-derives everything
from scratch (own fuel lookup, own dark-run walk). Shares no code with the solver on purpose.

    python -m whostayson.validate_output input.json output.json      -> exit 0 if valid
"""
import json
import sys
from decimal import Decimal


def check(inp: dict, out: dict) -> list:
    """Return a list of problems (empty = output obeys every rule for this input)."""
    problems = []
    if out.get("status") != "ok":
        return [f"status is {out.get('status')!r}, nothing to check"]
    grid = inp["grid_available"]
    outage = [h for h in range(10) if not grid[h]]
    shops = {s["id"]: s for s in inp["shops"]}
    cap = inp["generator_capacity_kw"]
    table = [(row["load_kw"], Decimal(str(row["litres_per_hour"]))) for row in inp["fuel_table"]]
    budget = Decimal(str(inp["fuel_budget_litres"]))

    entries = {e["hour"]: e for e in out["roster"]}
    if sorted(entries) != outage:
        problems.append(f"rule 1/8: roster hours {sorted(entries)} != outage hours {outage}")
    on = {}
    total_fuel, total_value = Decimal(0), 0
    for h, e in entries.items():
        powered, dark = list(e["powered"]), [d["id"] for d in e["dark"]]
        if sorted(powered + dark) != sorted(shops):
            problems.append(f"rule 8: {e['time']} powered+dark != shop ids")
        if set(powered) & set(dark):
            problems.append(f"rule 8: {e['time']} a shop is both powered and dark")
        for d in e["dark"]:
            if not str(d.get("reason", "")).strip():
                problems.append(f"rule 8: {e['time']} {d['id']} dark without a reason")
        on[h] = set(powered)
        load = sum(shops[s]["kw"] for s in powered if s in shops)
        if load > cap:
            problems.append(f"rule 3: {e['time']} load {load} kW > capacity {cap} kW")
        litres = Decimal(0)
        if load > 0:
            for kw, l in table:
                if load <= kw:
                    litres = l
                    break
            else:
                litres = table[-1][1]
        total_fuel += litres
        total_value += sum(shops[s]["value_per_slot"][h] for s in powered if s in shops)
        if Decimal(str(e.get("fuel_litres", litres))) != litres:
            problems.append(f"rule 4: {e['time']} reports {e['fuel_litres']} L, lookup says {litres} L")
    if total_fuel > budget:
        problems.append(f"rule 4: total fuel {total_fuel} L > budget {budget} L")
    if Decimal(str(out["total_fuel_litres"])) != total_fuel:
        problems.append(f"rule 8: total_fuel_litres {out['total_fuel_litres']} != recomputed {total_fuel}")
    if out["total_value"] != total_value:
        problems.append(f"rule 8: total_value {out['total_value']} != recomputed {total_value}")
    reported_dark = {s["id"]: s["dark_hours"] for s in out.get("shops", [])}
    for sid, s in shops.items():
        dark_hours = sum(1 for h in outage if sid not in on.get(h, ()))
        if s["type"] == "mandatory" and dark_hours:
            problems.append(f"rule 5: mandatory {sid} dark {dark_hours} hour(s)")
        if s["type"] == "normal":
            run = 0
            for h in range(10):
                run = 0 if grid[h] or sid in on.get(h, ()) else run + 1
                if run > inp["max_consecutive_dark"]:
                    problems.append(f"rule 6: {sid} dark {run} in a row at {10 + h}:00")
                    break
        if sid in reported_dark and reported_dark[sid] != dark_hours:
            problems.append(f"rule 8: {sid} dark_hours {reported_dark[sid]} != {dark_hours}")
    return problems


def main(argv):
    if len(argv) != 3:
        print(__doc__)
        return 2
    inp, out = json.load(open(argv[1])), json.load(open(argv[2]))
    problems = check(inp, out)
    for p in problems:
        print("FAIL", p)
    print("OK: output obeys every rule" if not problems else f"{len(problems)} problem(s)")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
