# Boundary check: load == capacity and fuel == budget, exactly

**Input:** `input.json` — the brief's five-shop worked example (10 kW generator, 8.00 L).

**Why it is a boundary case:** the optimum uses *exactly* 8.00 L of the 8.00 L budget and runs
the generator at *exactly* 10 kW of its 10 kW capacity in two hours. Both rules say "≤", so this
roster must be accepted, not rejected; and litres are compared in whole hundredths (rule 4), so
8.00 vs 8.00 must not fall to floating-point noise (we compare integer centilitres).

**Output:** `output.json` — status ok, value 84, total_fuel_litres 8.00, the value the brief
states for this input. `python -m whostayson.validate_output input.json output.json` passes.

**The other side of the edge (in tests):** `tests/test_solver.py::test_boundary_exact_limits`
lowers the budget to 7.99 L and checks the solver drops below 84 rather than overspend by 0.01 L.
