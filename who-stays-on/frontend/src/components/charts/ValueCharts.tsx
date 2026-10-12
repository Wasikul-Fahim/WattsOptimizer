import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Analysis } from "@/lib/analytics";
import { shopName } from "@/lib/format";
import { ChartLegend, ChartTooltip, useChartColors } from "./chartTheme";

/** Value served per outage hour. */
export function ValueByHourChart({ analysis, height = 240 }: { analysis: Analysis; height?: number }) {
  const c = useChartColors();
  const data = analysis.hours.filter((h) => !h.grid).map((h) => ({ time: h.time, value: h.value }));
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 18, right: 18, bottom: 0, left: -20 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="time" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} width={50} />
          <Tooltip cursor={{ fill: c.cursor }} content={<ChartTooltip unit="pts" />} />
          <Bar dataKey="value" name="Value" fill={c.teal} radius={[4, 4, 0, 0]} maxBarSize={34}>
            <LabelList dataKey="value" position="top" className="fill-[var(--muted-foreground)] font-mono text-[13px]" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Powered vs dark shops each outage hour (stacked, 2px gap between segments). */
export function ShopsPerHourChart({ analysis, height = 240 }: { analysis: Analysis; height?: number }) {
  const c = useChartColors();
  const data = analysis.hours.filter((h) => !h.grid).map((h) => ({ time: h.time, powered: h.poweredCount, dark: h.darkCount }));
  return (
    <div>
      <ChartLegend items={[{ label: "Powered", color: c.success }, { label: "Dark", color: c.danger }]} />
      <div style={{ height }} className="mt-3">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 18, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="time" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={50} />
            <Tooltip cursor={{ fill: c.cursor }} content={<ChartTooltip unit="shops" />} />
            <Bar dataKey="powered" name="Powered" stackId="s" fill={c.success} stroke={c.surface} strokeWidth={2} maxBarSize={34} />
            <Bar dataKey="dark" name="Dark" stackId="s" fill={c.danger} stroke={c.surface} strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={34} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Horizontal bars: value each shop earned today, ranked. */
export function ShopValueChart({ analysis }: { analysis: Analysis }) {
  const c = useChartColors();
  const data = analysis.shops
    .filter((s) => s.valueServed !== null)
    .map((s) => ({ name: shopName(s.id), value: s.valueServed ?? 0, mandatory: s.type === "mandatory" }))
    .sort((a, b) => b.value - a.value);
  if (!data.length) return <p className="text-sm text-muted-foreground">Shop values need the input JSON.</p>;
  return (
    <div style={{ height: Math.max(220, data.length * 30 + 20) }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 8 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={136} interval={0} />
          <Tooltip cursor={{ fill: c.cursor }} content={<ChartTooltip unit="pts" />} />
          <Bar dataKey="value" name="Value served" radius={[0, 4, 4, 0]} barSize={16} background={{ fill: c.track, radius: 4 }}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.mandatory ? c.blue : c.teal} />
            ))}
            <LabelList dataKey="value" position="right" className="fill-[var(--foreground)] font-mono text-[13px] font-bold" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Dark hours per shop, with the max-in-a-row rule shown as context. */
export function DarkHoursChart({ analysis }: { analysis: Analysis }) {
  const c = useChartColors();
  const data = analysis.shops
    .filter((s) => s.type === "normal")
    .map((s) => ({ name: shopName(s.id), dark: s.darkHours, run: s.longestDarkRun }))
    .sort((a, b) => b.dark - a.dark);
  return (
    <div>
      <ChartLegend items={[{ label: "Dark hours (total)", color: c.danger }, { label: "Longest run in a row", color: c.warning }]} />
      <div style={{ height: Math.max(220, data.length * 34 + 20) }} className="mt-3">
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 28, bottom: 0, left: 8 }} barGap={2}>
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={136} interval={0} />
            <Tooltip cursor={{ fill: c.cursor }} content={<ChartTooltip unit="h" />} />
            <Bar dataKey="dark" name="Dark hours" fill={c.danger} radius={[0, 4, 4, 0]} barSize={10}>
              <LabelList dataKey="dark" position="right" className="fill-[var(--muted-foreground)] font-mono text-[13px]" />
            </Bar>
            <Bar dataKey="run" name="Longest run" fill={c.warning} radius={[0, 4, 4, 0]} barSize={10} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
