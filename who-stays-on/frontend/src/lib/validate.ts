// Quick client-side checks so obvious mistakes are caught before upload.
// The backend (schema.validate) is the authority; its invalid_input message is shown verbatim.
import type { MarketInput } from "@/types/api";

export type CheckResult = { ok: true; input: MarketInput } | { ok: false; field: string; message: string };

export function parseInputText(text: string): CheckResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { ok: false, field: "file", message: `Not valid JSON: ${(e as Error).message}` };
  }
  return checkInput(data);
}

export function checkInput(data: unknown): CheckResult {
  if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false, field: "root", message: "Expected a JSON object" };
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.grid_available) || d.grid_available.length !== 10)
    return { ok: false, field: "grid_available", message: "Needs 10 true/false values (10:00–19:00)" };
  if (typeof d.generator_capacity_kw !== "number") return { ok: false, field: "generator_capacity_kw", message: "Must be a number" };
  if (typeof d.fuel_budget_litres !== "number") return { ok: false, field: "fuel_budget_litres", message: "Must be a number" };
  if (!Array.isArray(d.fuel_table) || d.fuel_table.length === 0) return { ok: false, field: "fuel_table", message: "Needs at least one load level" };
  if (typeof d.max_consecutive_dark !== "number") return { ok: false, field: "max_consecutive_dark", message: "Must be a number" };
  if (!Array.isArray(d.shops)) return { ok: false, field: "shops", message: "Must be a list" };
  for (const [i, s] of (d.shops as Record<string, unknown>[]).entries()) {
    if (!s || typeof s.id !== "string") return { ok: false, field: `shops[${i}].id`, message: "Missing shop id" };
    if (!Array.isArray(s.value_per_slot) || s.value_per_slot.length !== 10)
      return { ok: false, field: `shops[${i}].value_per_slot`, message: "Needs 10 numbers" };
  }
  return { ok: true, input: data as MarketInput };
}
