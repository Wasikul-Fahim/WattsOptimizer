// Turns the backend's reason strings (whostayson/reasons.py) into structured, displayable facts.
// The original text is always kept; parsing only adds numbers for the visual layout.

export type ReasonKind = "fuel" | "capacity" | "oversize" | "zero-value" | "trade-off" | "best-effort" | "other";

export interface ParsedReason {
  kind: ReasonKind;
  title: string;
  raw: string;
  /** kW the shop needs */
  shopKw?: number;
  /** load already on in that hour */
  loadKw?: number;
  /** load if this shop were switched on */
  newLoadKw?: number;
  capacityKw?: number;
  extraLitres?: number;
  dayTotalLitres?: number;
  budgetLitres?: number;
  /** "mobile_shop at 18:00 (value 8)" items */
  keptFor?: { shop: string; time: string; value: number }[];
  costValue?: number;
}

export const REASON_LABEL: Record<ReasonKind, string> = {
  fuel: "Fuel budget",
  capacity: "Capacity limit",
  oversize: "Too large",
  "zero-value": "No value",
  "trade-off": "Trade-off",
  "best-effort": "Best effort",
  other: "Other",
};

const FUEL =
  /^fuel: \+(\d+) kW lifts (\S+) from (\d+) kW to (\d+) kW \(\+([\d.]+) L\); day total would be ([\d.]+) L > ([\d.]+) L budget\s*[—-]\s*diesel kept for (.*)$/;
const CAPACITY = /^capacity: (\d+) kW on \+ (\d+) kW = (\d+) kW > (\d+) kW/;
const OVERSIZE = /^needs (\d+) kW, generator carries (\d+) kW/;
const TRADE = /^trade-off: forcing .+ costs (\d+) value/;
const KEPT = /([\w-]+) at (\d{2}:\d{2}) \(value (\d+)\)/g;

export function parseReason(raw: string): ParsedReason {
  let m = raw.match(FUEL);
  if (m) {
    const keptFor = [...m[8].matchAll(KEPT)].map((k) => ({ shop: k[1], time: k[2], value: Number(k[3]) }));
    return {
      kind: "fuel",
      title: REASON_LABEL.fuel,
      raw,
      shopKw: Number(m[1]),
      loadKw: Number(m[3]),
      newLoadKw: Number(m[4]),
      extraLitres: Number(m[5]),
      dayTotalLitres: Number(m[6]),
      budgetLitres: Number(m[7]),
      keptFor,
    };
  }
  if ((m = raw.match(CAPACITY))) {
    return {
      kind: "capacity",
      title: REASON_LABEL.capacity,
      raw,
      loadKw: Number(m[1]),
      shopKw: Number(m[2]),
      newLoadKw: Number(m[3]),
      capacityKw: Number(m[4]),
    };
  }
  if ((m = raw.match(OVERSIZE))) {
    return { kind: "oversize", title: REASON_LABEL.oversize, raw, shopKw: Number(m[1]), capacityKw: Number(m[2]) };
  }
  if (raw.startsWith("worth 0")) return { kind: "zero-value", title: REASON_LABEL["zero-value"], raw };
  if ((m = raw.match(TRADE))) return { kind: "trade-off", title: REASON_LABEL["trade-off"], raw, costValue: Number(m[1]) };
  if (raw.startsWith("best-effort") || raw.startsWith("no valid roster"))
    return { kind: "best-effort", title: REASON_LABEL["best-effort"], raw };
  return { kind: "other", title: REASON_LABEL.other, raw };
}
