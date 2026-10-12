# Bug: greedy v1 ran the generator dry by 19:00

**Input:** `input.json` (the public twelve-shop sample, unchanged).

**Earlier version:** `whostayson/solver_greedy.py` v1 chose shops one outage hour at a time by
that hour's value, taking anything that fit capacity and the fuel still in the budget. It burned
2.80 L in each of the first six outage hours (16.80 L of 17.00 L) and reached 19:00 with
0.20 L left — not enough for even the pharmacy and ATM. `output_v1_greedy.json` shows 19:00
with nothing powered: rule 5 (mandatory) broken for two shops, rule 6 (dark run) broken for five.

**Fix:** plan the whole day at once. `whostayson/solver.py` builds one exact model over all
outage hours (CP-SAT), so diesel is spent where the value is. `output_fixed.json` is its output
on the same input: every rule holds and the value is higher. The greedy was kept as the
labelled fallback and given a guard that reserves fuel for mandatory shops, so it can no longer
break rule 5 — but it still cannot see the evening, which is why it is not the primary solver.
