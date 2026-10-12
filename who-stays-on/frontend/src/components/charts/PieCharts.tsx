import type { ReactNode } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Analysis } from "@/lib/analytics";
import { pct, shopName } from "@/lib/format";
import { REASON_LABEL, type ReasonKind } from "@/lib/reasons";
import { ChartTooltip, useChartColors } from "./chartTheme";

interface Slice {
  name: string;
  value: number;
  color: string;
}

/** Donut with a centre figure and a direct-labelled legend (identity never by color alone). */
function Donut({
  data,
  center,
  centerSub,
  height = 200,
  unit,
  legend = true,
}: {
  data: Slice[];
  center: ReactNode;
  centerSub?: string;
  height?: number;
  unit?: string;
  legend?: boolean;
}) {
  const c = useChartColors();
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <div className="flex flex-col gap-4">
      <div className="relative" style={{ height }}>
        <ResponsiveContainer>
          <PieChart>
            <Tooltip content={<ChartTooltip unit={unit} />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="68%"
              outerRadius="96%"
              paddingAngle={data.filter((d) => d.value > 0).length > 1 ? 2 : 0}
              cornerRadius={4}
              stroke={c.surface}
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
              isAnimationActive
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-[31px] font-black leading-none tabular">{center}</div>
            {centerSub && <div className="label-caps mt-1.5 !text-[12px]">{centerSub}</div>}
          </div>
        </div>
      </div>
      {legend && (
        <ul className="grid gap-1.5">
          {data.map((d) => (
            <li key={d.name} className="flex items-center gap-2 text-[15px]">
              <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: d.color }} />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{d.name}</span>
              <span className="font-bold tabular">
                {d.value}
                {unit ? ` ${unit}` : ""}
              </span>
              <span className="w-11 text-right font-mono text-[13px] text-muted-foreground tabular">{total ? pct(d.value / total) : "—"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Diesel used vs left in the budget. */
export function FuelDonut({ analysis }: { analysis: Analysis }) {
  const c = useChartColors();
  const data = [
    { name: "Used", value: Number(analysis.totalFuel.toFixed(2)), color: analysis.fuelUsedPct > 0.9 ? c.warning : c.blue },
    { name: "Left", value: Number(analysis.fuelRemaining.toFixed(2)), color: c.track },
  ];
  return (
    <div className="py-3">
      <Donut data={data} center={pct(analysis.fuelUsedPct)} centerSub="of budget" unit="L" height={170} legend={false} />
    </div>
  );
}

/** Share of today's value by shop: top four + Other (never more than five slices). */
export function ValueSharePie({ analysis }: { analysis: Analysis }) {
  const c = useChartColors();
  const ranked = analysis.shops
    .filter((s) => (s.valueServed ?? 0) > 0)
    .map((s) => ({ name: shopName(s.id), value: s.valueServed ?? 0 }))
    .sort((a, b) => b.value - a.value);
  if (!ranked.length) return <p className="text-sm text-muted-foreground">Shop values need the input JSON.</p>;
  const top = ranked.slice(0, 4).map((s, i) => ({ ...s, color: c.categorical[i] }));
  const rest = ranked.slice(4).reduce((a, s) => a + s.value, 0);
  const data = rest > 0 ? [...top, { name: `Other ${ranked.length - 4} shops`, value: rest, color: c.other }] : top;
  return <Donut data={data} center={analysis.totalValue} centerSub="total value" unit="pts" />;
}

/** Powered vs dark shop-hours across all outage hours. */
export function PowerSplitDonut({ analysis }: { analysis: Analysis }) {
  const c = useChartColors();
  const total = analysis.poweredShopHours + analysis.darkShopHours;
  const data = [
    { name: "Powered shop-hours", value: analysis.poweredShopHours, color: c.success },
    { name: "Dark shop-hours", value: analysis.darkShopHours, color: c.danger },
  ];
  return <Donut data={data} center={total ? pct(analysis.poweredShopHours / total) : "—"} centerSub="powered" unit="h" />;
}

/** Why shops went dark: fuel budget vs capacity vs other causes. */
export function ReasonPie({ analysis }: { analysis: Analysis }) {
  const c = useChartColors();
  const order: ReasonKind[] = ["fuel", "capacity", "oversize", "zero-value", "trade-off", "best-effort", "other"];
  const present = order.filter((k) => analysis.reasonCounts[k] > 0);
  const data = present.map((k, i) => ({
    name: REASON_LABEL[k],
    value: analysis.reasonCounts[k],
    color: i < 4 ? c.categorical[i] : c.other,
  }));
  if (!data.length) return <p className="text-sm text-muted-foreground">No shop went dark.</p>;
  return <Donut data={data} center={analysis.darkShopHours} centerSub="dark hours" unit="h" />;
}

/** Value from mandatory vs normal shops. */
export function ShopTypeDonut({ analysis }: { analysis: Analysis }) {
  const c = useChartColors();
  const sum = (t: "mandatory" | "normal") =>
    analysis.shops.filter((s) => s.type === t).reduce((a, s) => a + (s.valueServed ?? 0), 0);
  const data = [
    { name: "Mandatory shops", value: sum("mandatory"), color: c.categorical[0] },
    { name: "Normal shops", value: sum("normal"), color: c.categorical[1] },
  ];
  if (!data[0].value && !data[1].value) return <p className="text-sm text-muted-foreground">Shop values need the input JSON.</p>;
  return <Donut data={data} center={analysis.shops.length} centerSub="shops" unit="pts" />;
}
