import { Droplets, Fuel, Gauge, Percent } from "lucide-react";
import { FuelChart } from "@/components/charts/FuelChart";
import { LoadChart, UtilizationChart } from "@/components/charts/LoadChart";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { FuelCard } from "@/components/dashboard/FuelCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRoster } from "@/hooks/useRoster";
import { pct } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function FuelPage() {
  const { analysis, current } = useRoster();
  const table = current?.input?.fuel_table ?? [];
  const usedLevels = new Set(analysis?.hours.filter((h) => !h.grid).map((h) => h.fuelLitres));

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Diesel & generator" title="Fuel analytics" />
      {!analysis ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard index={0} icon={Fuel} label="Fuel used" value={analysis.totalFuel.toFixed(2)} unit="L" progress={analysis.fuelUsedPct} />
            <MetricCard index={1} icon={Droplets} label="Fuel left" value={analysis.fuelRemaining.toFixed(2)} unit="L" tone="teal" description={`Budget ${analysis.fuelBudget.toFixed(2)} L`} />
            <MetricCard index={2} icon={Gauge} label="Peak load" value={analysis.peakLoad} unit={analysis.capacityKw ? `/ ${analysis.capacityKw} kW` : "kW"} description={analysis.peakHours.join(", ") || "—"} />
            <MetricCard
              index={3}
              icon={Percent}
              label="Avg capacity used"
              value={analysis.avgUtilization !== null ? pct(analysis.avgUtilization) : "—"}
              tone="teal"
              description="During outage hours"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Fuel consumption over time</CardTitle>
              </CardHeader>
              <CardContent>
                <FuelChart analysis={analysis} />
              </CardContent>
            </Card>
            <FuelCard analysis={analysis} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Generator load curve</CardTitle>
              </CardHeader>
              <CardContent>
                <LoadChart analysis={analysis} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Capacity utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <UtilizationChart analysis={analysis} height={262} />
              </CardContent>
            </Card>
          </div>

          {table.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Fuel table</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-[13px] text-muted-foreground">Fuel is charged once per hour on the combined load, rounded up to the next level.</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {table.map((row) => (
                    <div
                      key={row.load_kw}
                      className={cn("rounded-xl border border-border bg-sunken px-4 py-3", usedLevels.has(row.litres_per_hour) && "border-teal/50 bg-teal/8")}
                    >
                      <div className="label-caps !text-[10px]">Up to {row.load_kw} kW</div>
                      <div className="mt-1 text-xl font-black tabular">
                        {row.litres_per_hour.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">L / hour</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Used {analysis.hours.filter((h) => !h.grid && h.fuelLitres === row.litres_per_hour).length} hours
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
