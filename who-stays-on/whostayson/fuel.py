"""Fuel helpers. All litre quantities are handled internally as integer centilitres
(hundredths of a litre) so that rule 4 ("whole hundredths, no rounding tolerance")
is exact — no floats ever enter a comparison."""
from decimal import Decimal, InvalidOperation

HOURS = 10                      # slots 10:00 .. 19:00
SLOT_LABELS = [f"{10 + h}:00" for h in range(HOURS)]


def to_centilitres(x) -> int:
    """Convert a litre figure (int/float/str with <= 2 decimals) to integer centilitres.
    Raises ValueError if it has more than two decimals or is not a number."""
    if isinstance(x, bool):
        raise ValueError("boolean is not a number")
    try:
        d = Decimal(str(x))
    except (InvalidOperation, ValueError):
        raise ValueError("not a number")
    if not d.is_finite():
        raise ValueError("not a finite number")
    cl = d * 100
    if cl != cl.to_integral_value():
        raise ValueError("more than two decimal places")
    return int(cl)


def litres_str(cl: int) -> str:
    """Centilitres -> '8.00' style string."""
    sign = "-" if cl < 0 else ""
    cl = abs(cl)
    return f"{sign}{cl // 100}.{cl % 100:02d}"


def litres_float(cl: int) -> float:
    """Centilitres -> float with exactly two decimals (for JSON output)."""
    return round(cl / 100, 2)


def fuel_for_load(fuel_table, load_kw: int) -> int:
    """Centilitres burned in one hour at a combined load of `load_kw`.

    Rule 4: look up the *first* table row whose load_kw >= the combined load (rows are
    strictly increasing and the last row equals the generator capacity). A combined load of
    0 kW (nothing on) burns nothing. `fuel_table` is a list of (load_kw, centilitres) tuples.
    """
    if load_kw <= 0:
        return 0
    for row_kw, row_cl in fuel_table:
        if load_kw <= row_kw:
            return row_cl
    raise ValueError(f"load {load_kw} kW exceeds the last fuel-table row")
