import pytest

from tests.conftest import mutate
from whostayson.schema import InvalidInput, validate


def test_sample_validates(sample):
    inp = validate(sample)
    assert inp.capacity_kw == 20
    assert inp.budget_cl == 1700
    assert inp.fuel_table == ((7, 120), (14, 200), (20, 280))
    assert inp.max_dark == 2
    assert len(inp.shops) == 12
    assert inp.outage_hours == [2, 3, 4, 5, 7, 8, 9]
    assert inp.shops[0].mandatory and inp.shops[0].kw == 3
    assert sum(s.mandatory for s in inp.shops) >= 1


def test_unknown_keys_ignored_and_whole_floats_accepted(sample):
    d = mutate(sample, ["generator_capacity_kw"], 20.0)
    d["extra"] = {"anything": 1}
    assert validate(d).capacity_kw == 20


def test_empty_shop_list_is_valid(sample):
    assert validate(mutate(sample, ["shops"], [])).shops == ()


@pytest.mark.parametrize("path,value,field", [
    (["grid_available"], [True] * 9, "grid_available"),
    (["grid_available"], [True] * 11, "grid_available"),
    (["grid_available", 3], 1, "grid_available[3]"),
    (["grid_available", 0], "true", "grid_available[0]"),
    (["generator_capacity_kw"], 0, "generator_capacity_kw"),
    (["generator_capacity_kw"], 20.5, "generator_capacity_kw"),
    (["generator_capacity_kw"], "20", "generator_capacity_kw"),
    (["generator_capacity_kw"], True, "generator_capacity_kw"),
    (["fuel_budget_litres"], -1, "fuel_budget_litres"),
    (["fuel_budget_litres"], 17.001, "fuel_budget_litres"),
    (["fuel_budget_litres"], "17", "fuel_budget_litres"),
    (["fuel_table"], [], "fuel_table"),
    (["fuel_table", 1, "load_kw"], 7, "fuel_table[1].load_kw"),            # not increasing
    (["fuel_table", 2, "load_kw"], 19, "fuel_table[2].load_kw"),           # last != capacity
    (["fuel_table", 0, "litres_per_hour"], 1.234, "fuel_table[0].litres_per_hour"),
    (["fuel_table", 0, "litres_per_hour"], -0.5, "fuel_table[0].litres_per_hour"),
    (["fuel_table", 0, "load_kw"], 0, "fuel_table[0].load_kw"),
    (["max_consecutive_dark"], -1, "max_consecutive_dark"),
    (["max_consecutive_dark"], 1.5, "max_consecutive_dark"),
    (["shops"], "none", "shops"),
    (["shops", 0, "id"], "", "shops[0].id"),
    (["shops", 0, "id"], "   ", "shops[0].id"),
    (["shops", 1, "id"], "pharmacy", "shops[1].id"),                       # duplicate
    (["shops", 0, "kw"], 0, "shops[0].kw"),
    (["shops", 0, "kw"], 2.5, "shops[0].kw"),
    (["shops", 0, "type"], "essential", "shops[0].type"),
    (["shops", 0, "value_per_slot"], [6] * 9, "shops[0].value_per_slot"),
    (["shops", 0, "value_per_slot", 4], -1, "shops[0].value_per_slot[4]"),
    (["shops", 0, "value_per_slot", 4], 2.5, "shops[0].value_per_slot[4]"),
])
def test_invalid_cases_name_the_field(sample, path, value, field):
    with pytest.raises(InvalidInput) as e:
        validate(mutate(sample, path, value))
    assert e.value.field == field
    assert e.value.message


def test_missing_key(sample):
    del sample["fuel_table"]
    with pytest.raises(InvalidInput) as e:
        validate(sample)
    assert e.value.field == "fuel_table"


def test_too_many_shops(sample):
    extra = dict(sample["shops"][2], id="s13")
    with pytest.raises(InvalidInput) as e:
        validate(mutate(sample, ["shops"], sample["shops"] + [extra]))
    assert e.value.field == "shops"


def test_not_an_object():
    with pytest.raises(InvalidInput):
        validate([1, 2, 3])
