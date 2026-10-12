import { ArrowRight, Coins, Cpu, FileUp, Fuel, Gauge, MoonStar, PlugZap, Sparkles, Store, Unplug, Zap } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { FuelChart } from "@/components/charts/FuelChart";
import { LoadChart } from "@/components/charts/LoadChart";
import { ValueSharePie } from "@/components/charts/PieCharts";
import { ConflictBanner } from "@/components/common/ConflictBanner";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/common/Loader";
import { LogoMark } from "@/components/common/Logo";
import { FuelCard } from "@/components/dashboard/FuelCard";
import { LoadGauge } from "@/components/dashboard/LoadGauge";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { StatusCard } from "@/components/dashboard/StatusCard";
import { RosterLegend, RosterTable } from "@/components/roster/RosterTable";
import { UpdateJsonDialog } from "@/components/upload/UpdateJsonDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useRoster } from "@/hooks/useRoster";
import { liveSlot, type Analysis } from "@/lib/analytics";
import { HOURS, pct } from "@/lib/format";
import { delta } from "@/lib/trend";

function nextChange(analysis: Analysis, from: number, grid: boolean): string | null {
  for (let h = from + 1; h < 10; h++) if (analysis.hours[h].grid !== grid) return HOURS[h];
  return null;
}

function LiveStatus({ analysis }: { analysis: Analysis }) {
  const slot = liveSlot();
  const solver = analysis.status === "infeasible" ? "Best effort" : analysis.solver === "cp-sat" ? "Optimal" : "Fallback";
  const solverDetail = analysis.status === "infeasible" ? "Rules conflict, see banner" : analysis.solver === "cp-sat" ? "Proven by CP-SAT solver" : "Greedy solver used";

  let gen: { value: string; detail: string; tone: "neutral" | "success"; live: boolean } = { value: "Standby", detail: "Outside 10:00–20:00", tone: "neutral", live: false };
  let grid: { value: string; detail: string; tone: "neutral" | "success" | "danger" } = { value: "Unknown", detail: "Outside schedule", tone: "neutral" };
  if (slot !== null) {
    const h = analysis.hours[slot];
    const change = nextChange(analysis, slot, h.grid);
    if (h.grid) {
      gen = { value: "Standby", detail: "Grid is carrying the market", tone: "neutral", live: false };
      grid = { value: "Available", detail: change ? `Outage from ${change}` : "No more outages today", tone: "success" };
    } else {
      gen = {
        value: `Running · ${h.loadKw} kW`,
        detail: `${h.poweredCount} shops on · ${h.fuelLitres.toFixed(2)} L this hour`,
        tone: "success",
        live: true,
      };
      grid = { value: "Outage", detail: change ? `Back at ${change}` : "Out until 20:00", tone: "danger" };
    }
  } else {
    const outages = analysis.outageHours.length;
    grid = { value: `${outages} outage hours`, detail: outages ? `${HOURS[analysis.outageHours[0]]} first` : "Grid all day", tone: outages ? "danger" : "success" };
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatusCard icon={Zap} label="Generator" value={gen.value} detail={gen.detail} tone={gen.tone} live={gen.live} />
      <StatusCard icon={grid.tone === "danger" ? Unplug : PlugZap} label="Grid" value={grid.value} detail={grid.detail} tone={grid.tone} />
      <StatusCard icon={Cpu} label="Optimizer" value={solver} detail={solverDetail} tone={analysis.status === "infeasible" ? "danger" : "blue"} />
    </div>
  );
}

export default function DashboardPage() {
  const { analysis, previousAnalysis: prev, current, loading } = useRoster();
  const { can } = useAuth();
  const [updating, setUpdating] = useState(false);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <LogoMark size={78} className="max-sm:hidden" />
          <div>
            <div className="label-caps !text-blue-ink">Control center</div>
            <h1 className="mt-1 text-[33.5px] font-black leading-tight">Today's power plan</h1>
          </div>
        </div>
        <div className="flex gap-2">
          {can("secretary") && (
            <Button variant="secondary" onClick={() => setUpdating(true)}>
              <FileUp /> Update JSON
            </Button>
          )}
          <Button variant="primary" asChild>
            <Link to="/roster">
              View roster <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>

      {!analysis && loading && (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      )}
      {!analysis && !loading && <EmptyState />}
      {can("secretary") && <UpdateJsonDialog open={updating} onOpenChange={setUpdating} />}

      {analysis && current && (
        <>
          <ConflictBanner result={current.result} />
          <LiveStatus analysis={analysis} />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              index={0}
              icon={Coins}
              label="Total value generated"
              value={analysis.totalValue}
              unit="pts"
              description="Value of every powered shop-hour"
              trend={delta(analysis.totalValue, prev?.totalValue) ?? { dir: "up", label: analysis.valueCapturePct ? pct(analysis.valueCapturePct) : "today" }}
            />
            <MetricCard
              index={1}
              icon={Fuel}
              label="Fuel consumed"
              value={analysis.totalFuel.toFixed(2)}
              unit={`/ ${analysis.fuelBudget.toFixed(2)} L`}
              progress={analysis.fuelUsedPct}
              tone="teal"
              trend={delta(analysis.totalFuel, prev?.totalFuel, { goodWhenUp: false, digits: 2, suffix: " L" }) ?? { dir: "flat", label: pct(analysis.fuelUsedPct) }}
            />
            <MetricCard
              index={2}
              icon={Gauge}
              label="Generator load"
              value={analysis.peakLoad}
              unit={analysis.capacityKw ? `/ ${analysis.capacityKw} kW peak` : "kW peak"}
              description={analysis.peakHours.length ? `Peak at ${analysis.peakHours.join(", ")}` : "No outage today"}
              trend={
                delta(analysis.peakLoad, prev?.peakLoad, { suffix: " kW" }) ??
                (analysis.avgUtilization !== null ? { dir: "flat", label: `avg ${pct(analysis.avgUtilization)}` } : undefined)
              }
            />
            <MetricCard
              index={3}
              icon={Sparkles}
              label="Optimization score"
              value={analysis.valueCapturePct !== null ? Math.round(analysis.valueCapturePct * 100) : "—"}
              unit="%"
              description="Value served of total demand"
              progress={analysis.valueCapturePct ?? undefined}
              trend={
                analysis.status === "infeasible"
                  ? { dir: "down", label: "infeasible" }
                  : { dir: "up", label: analysis.solver === "cp-sat" ? "optimal" : analysis.solver }
              }
            />
            <MetricCard
              index={4}
              icon={Store}
              label="Active shops"
              value={analysis.avgActiveShops.toFixed(1)}
              unit={`/ ${analysis.shops.length} per hour`}
              description="Average during outage hours"
              tone="teal"
              trend={delta(analysis.avgActiveShops, prev?.avgActiveShops, { digits: 1 })}
            />
            <MetricCard
              index={5}
              icon={MoonStar}
              label="Dark shops"
              value={analysis.darkShopHours}
              unit="shop-hours"
              description={`Across ${analysis.outageHours.length} outage hours`}
              tone="danger"
              trend={delta(analysis.darkShopHours, prev?.darkShopHours, { goodWhenUp: false }) ?? { dir: "flat", label: `max ${Math.max(0, ...analysis.shops.map((s) => s.longestDarkRun))}h row` }}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="flex flex-col items-center justify-center p-5">
              <h3 className="self-start text-[18px] font-bold">Peak generator load</h3>
              <div className="flex flex-1 items-center py-4">
                <LoadGauge value={analysis.peakLoad} max={analysis.capacityKw ?? analysis.peakLoad} label="Peak vs capacity" />
              </div>
            </Card>
            <FuelCard analysis={analysis} />
            <Card className="p-5">
              <h3 className="mb-4 text-[18px] font-bold">Value by shop</h3>
              <ValueSharePie analysis={analysis} />
            </Card>
          </div>

          <section className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-black">Roster board</h2>
              <RosterLegend />
            </div>
            <RosterTable analysis={analysis} showSummary={false} />
          </section>

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
                <CardTitle>Fuel over the day</CardTitle>
              </CardHeader>
              <CardContent>
                <FuelChart analysis={analysis} height={260} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
