import type { ReactNode } from "react";
import { useTheme } from "@/hooks/useTheme";

// Categorical palette, fixed order, validated for CVD separation per theme (dataviz validator).
// Slot 5 ("Other") is a deliberate neutral, not a series hue.
const CATEGORICAL = {
  light: ["#1E7FD0", "#00A08A", "#9A5BE0", "#C47A1E"],
  dark: ["#2A8BD8", "#00A88C", "#9C78F0", "#C4822C"],
};
const OTHER = { light: "#a7b2c2", dark: "#5d6670" };

export function useChartColors() {
  const { theme } = useTheme();
  return {
    categorical: CATEGORICAL[theme],
    other: OTHER[theme],
    teal: theme === "dark" ? "#00e5c3" : "#00b89c",
    blue: theme === "dark" ? "#00a8ff" : "#0a8ee0",
    success: theme === "dark" ? "#39ff88" : "#1fbf65",
    danger: "#ff4d6d",
    warning: "#ffb020",
    track: theme === "dark" ? "rgba(255,255,255,0.08)" : "#e3e9f3",
    surface: theme === "dark" ? "#292d32" : "#ffffff",
    cursor: theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(34,60,100,0.05)",
  };
}

interface TooltipRow {
  name?: ReactNode;
  value?: number | string | readonly (number | string)[];
  color?: string;
  payload?: Record<string, unknown> & { fill?: string };
}

/** Token-styled tooltip used by every chart. */
export function ChartTooltip({
  active,
  payload,
  label,
  unit,
  formatter,
}: {
  active?: boolean;
  payload?: readonly TooltipRow[];
  label?: ReactNode;
  unit?: string;
  formatter?: (value: number, name: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[140px] rounded-xl border border-border bg-card px-3 py-2.5 shadow-card">
      {label !== undefined && label !== "" && <div className="mb-1.5 font-mono text-[11px] font-bold text-muted-foreground">{label}</div>}
      <div className="grid gap-1">
        {payload.map((p, i) => {
          const v = typeof p.value === "number" ? p.value : Number(p.value);
          const color = p.color ?? p.payload?.fill;
          return (
            <div key={i} className="flex items-center gap-2 text-[12.5px]">
              <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: color }} />
              <span className="text-muted-foreground">{String(p.name ?? "")}</span>
              <span className="ml-auto pl-3 font-bold tabular">
                {formatter ? formatter(v, String(p.name ?? "")) : `${Number.isFinite(v) ? v : p.value}${unit ? ` ${unit}` : ""}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ChartLegend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          {i.dashed ? (
            <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: i.color }} />
          ) : (
            <span className="size-2.5 rounded-[3px]" style={{ background: i.color }} />
          )}
          {i.label}
        </span>
      ))}
    </div>
  );
}
