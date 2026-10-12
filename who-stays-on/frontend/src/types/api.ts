// Shapes of the WattsOptimizer backend (see who-stays-on/docs/API.md).

export type ShopType = "mandatory" | "normal";
export type Role = "admin" | "secretary" | "committee";

/** The input JSON a market sends to POST /api/roster. */
export interface MarketInput {
  _story?: string;
  grid_available: boolean[]; // 10 slots, 10:00 … 19:00
  generator_capacity_kw: number;
  fuel_budget_litres: number;
  fuel_table: { load_kw: number; litres_per_hour: number }[];
  max_consecutive_dark: number;
  shops: { id: string; kw: number; type: ShopType; value_per_slot: number[] }[];
}

export interface DarkEntry {
  id: string;
  reason: string;
}

export interface RosterHour {
  hour: number; // 0–9 (0 = 10:00)
  time: string; // "12:00"
  powered: string[];
  dark: DarkEntry[];
  load_kw: number;
  fuel_litres: number;
  value: number;
}

export interface ShopSummary {
  id: string;
  kw: number;
  type: ShopType;
  dark_hours: number;
}

export interface Conflict {
  rule: number;
  shops: string[];
  hours: string[];
  message: string;
}

interface ResultBase {
  total_value: number;
  total_fuel_litres: number;
  fuel_budget_litres: number;
  shops: ShopSummary[];
  grid_available: boolean[];
}

export interface OkResult extends ResultBase {
  status: "ok";
  roster: RosterHour[];
  solver: "cp-sat" | "greedy" | string;
}

export interface InfeasibleResult extends ResultBase {
  status: "infeasible";
  conflict: Conflict;
  best_effort_roster: RosterHour[];
  best_effort_note: string;
  solver?: string;
}

export interface InvalidResult {
  status: "invalid_input";
  field?: string;
  message: string;
}

export type RosterResult = OkResult | InfeasibleResult;
export type RosterResponse = RosterResult | InvalidResult;

export interface User {
  username: string;
  role: Role;
}

export interface UserRecord extends User {
  created: number; // unix seconds
}

/** GET /api/today: the roster a secretary last published. */
export type TodayResponse =
  | { status: "none" }
  | { by: string; at: number; input: MarketInput; output: RosterResponse };
