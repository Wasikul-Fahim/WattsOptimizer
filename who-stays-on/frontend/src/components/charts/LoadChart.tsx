import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Analysis } from "@/lib/analytics";
import { ChartLegend, ChartTooltip, useChartColors } from "./chartTheme";

/** Generator load per outage hour against capacity. */
export function LoadChart({ analysis, height = 260 }: { analysis: Analysis; height?: number }) {
  const c = useChartColors();
  const cap = analysis.capacityKw;
  const data = analysis.hours.filter((h) => !h.grid).map((h) => ({ time: h.time, load: h.loadKw }));
  return (
    <div>
      <ChartLegend items={[{ label: "Load kW", color: c.teal }, ...(cap ? [{ label: `Capacity ${cap} kW`, color: c.danger, dashed: true }] : [])]} />
      <div style={{ height }} className="mt-3">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 18, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="load-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={c.teal} stopOpacity={0.35} />
                <stop offset="1" stopColor={c.blue} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="time" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} unit=" kW" width={66} domain={[0, Math.ceil((cap ?? analysis.peakLoad) * 1.1)]} />
            <Tooltip cursor={{ stroke: c.blue, strokeDasharray: "3 3" }} content={<ChartTooltip unit="kW" />} />
            {cap && <ReferenceLine y={cap} stroke={c.danger} strokeWidth={1.5} />}
            <Area dataKey="load" name="Load" type="monotone" stroke={c.teal} strokeWidth={2} fill="url(#load-fill)" dot={{ r: 4, fill: c.teal, stroke: c.surface, strokeWidth: 2 }} activeDot={{ r: 6 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Share of generator capacity used each outage hour. */
export function UtilizationChart({ analysis, height = 240 }: { analysis: Analysis; height?: number }) {
  const c = useChartColors();
  const data = analysis.hours
    .filter((h) => !h.grid && h.utilization !== null)
    .map((h) => ({ time: h.time, util: Math.round((h.utilization ?? 0) * 100) }));
  if (!data.length) return <p className="text-sm text-muted-foreground">Capacity unknown for this roster.</p>;
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 18, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="time" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} unit="%" domain={[0, 100]} width={54} />
          <Tooltip cursor={{ fill: c.cursor }} content={<ChartTooltip unit="%" />} />
          <Bar dataKey="util" name="Capacity used" radius={[4, 4, 0, 0]} maxBarSize={34} background={{ fill: c.track, radius: 4 }}>
            {data.map((d) => (
              <Cell key={d.time} fill={d.util >= 95 ? c.warning : c.blue} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
