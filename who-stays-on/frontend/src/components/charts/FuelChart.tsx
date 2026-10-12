import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Analysis } from "@/lib/analytics";
import { ChartLegend, ChartTooltip, useChartColors } from "./chartTheme";

/** Litres per outage hour (bars) and running total against the day's budget (line). One axis: litres. */
export function FuelChart({ analysis, height = 280 }: { analysis: Analysis; height?: number }) {
  const c = useChartColors();
  const data = analysis.hours
    .filter((h) => !h.grid)
    .map((h) => ({ time: h.time, hourly: h.fuelLitres, total: h.cumulativeFuel }));
  const max = Math.max(analysis.fuelBudget, ...data.map((d) => d.total)) * 1.08;
  return (
    <div>
      <ChartLegend
        items={[
          { label: "Litres this hour", color: c.blue },
          { label: "Running total", color: c.teal },
          { label: `Budget ${analysis.fuelBudget.toFixed(2)} L`, color: c.danger, dashed: true },
        ]}
      />
      <div style={{ height }} className="mt-3">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 18, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="time" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} domain={[0, Math.ceil(max)]} unit=" L" width={56} />
            <Tooltip cursor={{ fill: c.cursor }} content={<ChartTooltip unit="L" formatter={(v) => `${v.toFixed(2)} L`} />} />
            <ReferenceLine y={analysis.fuelBudget} stroke={c.danger} strokeWidth={1.5} />
            <Bar dataKey="hourly" name="This hour" fill={c.blue} radius={[4, 4, 0, 0]} maxBarSize={34} />
            <Line dataKey="total" name="Running total" type="monotone" stroke={c.teal} strokeWidth={2} dot={{ r: 4, fill: c.teal, stroke: c.surface, strokeWidth: 2 }} activeDot={{ r: 6 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
