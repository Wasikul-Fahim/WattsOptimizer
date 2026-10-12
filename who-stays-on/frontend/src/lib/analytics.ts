// Pure derivations from a backend result (+ the input it was computed from).
// Nothing here decides who is powered — that is the backend's job. We only read and summarise.
import type { MarketInput, RosterHour, RosterResult, ShopType } from "@/types/api";
import { HOURS } from "./format";
import { parseReason, type ParsedReason, type ReasonKind } from "./reasons";

export type CellState = "on" | "off" | "grid";

export interface Cell {
  hour: number;
  time: string;
  state: CellState;
  reason?: ParsedReason;
  value: number; // value_per_slot for this hour (0 if unknown)
}

export interface ShopView {
  id: string;
  kw: number;
  type: ShopType;
  darkHours: number;
  poweredHours: number;
  longestDarkRun: number;
  valueServed: number | null; // null when the input is not available
  valueDemand: number | null; // value if it were on every outage hour
  cells: Cell[];
}

export interface HourView {
  hour: number;
  time: string;
  grid: boolean;
  loadKw: number;
  fuelLitres: number;
  cumulativeFuel: number;
  value: number;
  poweredCount: number;
  darkCount: number;
  utilization: number | null; // load / capacity
}

export interface DarkItem {
  shopId: string;
  hour: number;
  time: string;
  kw: number;
  reason: ParsedReason;
}

export interface Analysis {
  status: RosterResult["status"];
  solver: string;
  isBestEffort: boolean;
  rosterHours: RosterHour[];
  outageHours: number[];
  shops: ShopView[];
  hours: HourView[];
  darkItems: DarkItem[];
  capacityKw: number | null;
  totalValue: number;
  totalFuel: number;
  fuelBudget: number;
  fuelRemaining: number;
  fuelUsedPct: number;
  peakLoad: number;
  peakHours: string[];
  avgUtilization: number | null;
  demandValue: number | null;
  valueCapturePct: number | null;
  poweredShopHours: number;
  darkShopHours: number;
  avgActiveShops: number;
  reasonCounts: Record<ReasonKind, number>;
  maxConsecutiveDark: number | null;
}

export function analyse(result: RosterResult, input: MarketInput | null): Analysis {
  const rosterHours = result.status === "ok" ? result.roster : result.best_effort_roster ?? [];
  const byHour = new Map(rosterHours.map((r) => [r.hour, r]));
  const inputShops = new Map((input?.shops ?? []).map((s) => [s.id, s]));
  const capacityKw = input?.generator_capacity_kw ?? null;
  const grid = result.grid_available;
  const outageHours = grid.map((g, i) => (g ? -1 : i)).filter((i) => i >= 0);

  const darkItems: DarkItem[] = [];
  const reasonCounts = { fuel: 0, capacity: 0, oversize: 0, "zero-value": 0, "trade-off": 0, "best-effort": 0, other: 0 } as Record<ReasonKind, number>;

  const shops: ShopView[] = result.shops.map((s) => {
    const values = inputShops.get(s.id)?.value_per_slot;
    let run = 0;
    let longest = 0;
    let served = 0;
    let demand = 0;
    let powered = 0;
    const cells: Cell[] = HOURS.map((time, h) => {
      const value = values?.[h] ?? 0;
      if (grid[h]) {
        run = 0;
        return { hour: h, time, state: "grid", value };
      }
      demand += value;
      const r = byHour.get(h);
      const dark = r?.dark.find((d) => d.id === s.id);
      if (r && !dark) {
        run = 0;
        powered++;
        served += value;
        return { hour: h, time, state: "on", value };
      }
      run++;
      longest = Math.max(longest, run);
      const reason = parseReason(dark?.reason ?? "no roster entry for this hour");
      reasonCounts[reason.kind]++;
      darkItems.push({ shopId: s.id, hour: h, time, kw: s.kw, reason });
      return { hour: h, time, state: "off", reason, value };
    });
    return {
      id: s.id,
      kw: s.kw,
      type: s.type,
      darkHours: s.dark_hours,
      poweredHours: powered,
      longestDarkRun: longest,
      valueServed: values ? served : null,
      valueDemand: values ? demand : null,
      cells,
    };
  });

  let cumulative = 0;
  const hours: HourView[] = HOURS.map((time, h) => {
    const r = byHour.get(h);
    cumulative += r?.fuel_litres ?? 0;
    return {
      hour: h,
      time,
      grid: grid[h],
      loadKw: r?.load_kw ?? 0,
      fuelLitres: r?.fuel_litres ?? 0,
      cumulativeFuel: Math.round(cumulative * 100) / 100,
      value: r?.value ?? 0,
      poweredCount: r?.powered.length ?? (grid[h] ? result.shops.length : 0),
      darkCount: r?.dark.length ?? 0,
      utilization: capacityKw && r ? r.load_kw / capacityKw : null,
    };
  });

  const outageViews = hours.filter((h) => !h.grid);
  const peakLoad = Math.max(0, ...outageViews.map((h) => h.loadKw));
  const utils = outageViews.map((h) => h.utilization).filter((u): u is number => u !== null);
  const demandValue = input ? shops.reduce((a, s) => a + (s.valueDemand ?? 0), 0) : null;
  const poweredShopHours = rosterHours.reduce((a, r) => a + r.powered.length, 0);
  const darkShopHours = rosterHours.reduce((a, r) => a + r.dark.length, 0);

  return {
    status: result.status,
    solver: ("solver" in result && result.solver) || "—",
    isBestEffort: result.status === "infeasible",
    rosterHours,
    outageHours,
    shops,
    hours,
    darkItems,
    capacityKw,
    totalValue: result.total_value,
    totalFuel: result.total_fuel_litres,
    fuelBudget: result.fuel_budget_litres,
    fuelRemaining: Math.max(0, Math.round((result.fuel_budget_litres - result.total_fuel_litres) * 100) / 100),
    fuelUsedPct: result.fuel_budget_litres > 0 ? result.total_fuel_litres / result.fuel_budget_litres : 0,
    peakLoad,
    peakHours: outageViews.filter((h) => h.loadKw === peakLoad && peakLoad > 0).map((h) => h.time),
    avgUtilization: utils.length ? utils.reduce((a, b) => a + b, 0) / utils.length : null,
    demandValue,
    valueCapturePct: demandValue ? result.total_value / demandValue : null,
    poweredShopHours,
    darkShopHours,
    avgActiveShops: rosterHours.length ? poweredShopHours / rosterHours.length : 0,
    reasonCounts,
    maxConsecutiveDark: input?.max_consecutive_dark ?? null,
  };
}

/** Status of the generator right now, from the wall clock and the schedule. */
export function liveSlot(now = new Date()): number | null {
  const h = now.getHours();
  return h >= 10 && h < 20 ? h - 10 : null;
}
