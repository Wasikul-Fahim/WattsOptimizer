import pytest

from whostayson.fuel import fuel_for_load, litres_str, to_centilitres


def test_to_centilitres():
    assert to_centilitres(17.0) == 1700
    assert to_centilitres(2.8) == 280
    assert to_centilitres(0) == 0
    assert to_centilitres(1.25) == 125
    assert to_centilitres(0.1) == 10            # float 0.1 must not become 9 or 11


@pytest.mark.parametrize("bad", [1.234, 0.001, "x", True, float("nan"), float("inf")])
def test_to_centilitres_rejects(bad):
    with pytest.raises(ValueError):
        to_centilitres(bad)


def test_litres_str():
    assert litres_str(800) == "8.00"
    assert litres_str(5) == "0.05"
    assert litres_str(1760) == "17.60"


def test_fuel_for_load():
    table = ((7, 120), (14, 200), (20, 280))
    assert fuel_for_load(table, 0) == 0
    assert fuel_for_load(table, 1) == 120
    assert fuel_for_load(table, 7) == 120
    assert fuel_for_load(table, 8) == 200
    assert fuel_for_load(table, 14) == 200
    assert fuel_for_load(table, 20) == 280
    with pytest.raises(ValueError):
        fuel_for_load(table, 21)
