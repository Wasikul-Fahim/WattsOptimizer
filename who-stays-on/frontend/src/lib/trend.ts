import type { Trend } from "@/components/dashboard/MetricCard";

/** Change vs the previous run on screen (what-if comparison). */
export function delta(cur: number, prev: number | undefined | null, opts: { goodWhenUp?: boolean; digits?: number; suffix?: string } = {}): Trend | undefined {
  if (prev === undefined || prev === null) return undefined;
  const d = cur - prev;
  const digits = opts.digits ?? 0;
  if (Math.abs(d) < Math.pow(10, -digits) / 2) return { dir: "flat", label: "same" };
  return {
    dir: d > 0 ? "up" : "down",
    label: `${d > 0 ? "+" : ""}${d.toFixed(digits)}${opts.suffix ?? ""}`,
    goodWhenUp: opts.goodWhenUp,
  };
}
