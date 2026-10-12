"""A roster = which shops are on in each outage hour, plus everything the rules need to
check or report about it. Shared by every solver, the serializer and the tests, so value
and fuel are always *recomputed from the roster*, never read out of a solver."""
from dataclasses import dataclass, field

from .fuel import HOURS, fuel_for_load
from .schema import Input


@dataclass
class Roster:
    inp: Input
    on: dict = field(default_factory=dict)   # hour -> set of powered shop ids (outage hours only)
    solver: str = "cp-sat"                   # which engine produced it
    reasons: dict = field(default_factory=dict)  # (shop_id, hour) -> reason text for dark cells

    # --- per-hour metrics -------------------------------------------------------------
    def is_on(self, sid: str, h: int) -> bool:
        return sid in self.on.get(h, ())

    def load_kw(self, h: int) -> int:
        kw = {s.id: s.kw for s in self.inp.shops}
        return sum(kw[sid] for sid in self.on.get(h, ()))

    def fuel_cl(self, h: int) -> int:
        load = self.load_kw(h)
        if load > self.inp.capacity_kw:            # already a rule-3 violation; charge the top row
            return self.inp.fuel_table[-1][1]
        return fuel_for_load(self.inp.fuel_table, load)

    def value(self, h: int) -> int:
        val = {s.id: s.value[h] for s in self.inp.shops}
        return sum(val[sid] for sid in self.on.get(h, ()))

    # --- totals ------------------------------------------------------------------------
    def total_fuel_cl(self) -> int:
        return sum(self.fuel_cl(h) for h in self.inp.outage_hours)

    def total_value(self) -> int:
        return sum(self.value(h) for h in self.inp.outage_hours)

    def dark_hours(self, sid: str) -> int:
        return sum(1 for h in self.inp.outage_hours if not self.is_on(sid, h))

    def longest_dark_run(self, sid: str) -> int:
        """Rule 6 walk: dark outage hour +1, on hour or grid hour resets to 0."""
        run = best = 0
        for h in range(HOURS):
            if self.inp.grid[h] or self.is_on(sid, h):
                run = 0
            else:
                run += 1
                best = max(best, run)
        return best

    # --- rule check ----------------------------------------------------------------------
    def violations(self) -> list:
        """Every rule broken by this roster, as (rule, message). Empty == valid."""
        v = []
        inp = self.inp
        ids = {s.id for s in inp.shops}
        for h in inp.outage_hours:
            unknown = set(self.on.get(h, ())) - ids
            if unknown:
                v.append((8, f"{sorted(unknown)} at {10 + h}:00 are not shops"))
            if self.load_kw(h) > inp.capacity_kw:
                v.append((3, f"load {self.load_kw(h)} kW > capacity {inp.capacity_kw} kW at {10 + h}:00"))
        for h in range(HOURS):
            if inp.grid[h] and self.on.get(h):
                v.append((1, f"roster entry for grid hour {10 + h}:00"))
        if self.total_fuel_cl() > inp.budget_cl:
            v.append((4, f"fuel {self.total_fuel_cl() / 100:.2f} L > budget {inp.budget_cl / 100:.2f} L"))
        for s in inp.shops:
            if s.mandatory:
                off = [10 + h for h in inp.outage_hours if not self.is_on(s.id, h)]
                if off:
                    v.append((5, f"mandatory '{s.id}' dark at {off}"))
            else:
                run = self.longest_dark_run(s.id)
                if run > inp.max_dark:
                    v.append((6, f"'{s.id}' dark {run} hours in a row > {inp.max_dark}"))
        return v
