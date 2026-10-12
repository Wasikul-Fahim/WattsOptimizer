import { Download, FileJson, Printer } from "lucide-react";
import logo from "@/assets/logo.png";
import { ConflictBanner } from "@/components/common/ConflictBanner";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ResultStatusBadge } from "@/components/common/StatusPill";
import { RosterLegend, RosterTable } from "@/components/roster/RosterTable";
import { Button } from "@/components/ui/button";
import { useRoster } from "@/hooks/useRoster";
import { downloadJson } from "@/lib/download";
import { shopName } from "@/lib/format";

export default function ReportPage() {
  const { analysis, current } = useRoster();
  const date = new Date((current?.at ?? Date.now() / 1000) * 1000);
  const stamp = date.toISOString().slice(0, 10);

  return (
    <div className="grid gap-6 print:gap-0">
      <PageHeader
        eyebrow="Export"
        title="Report & print"
        className="no-print"
        actions={
          analysis &&
          current && (
            <>
              {current.input && (
                <Button variant="ghost" onClick={() => downloadJson(current.input, `market-input-${stamp}.json`)}>
                  <FileJson /> Input JSON
                </Button>
              )}
              <Button variant="secondary" onClick={() => downloadJson(current.result, `roster-${stamp}.json`)}>
                <Download /> Download JSON
              </Button>
              <Button variant="primary" onClick={() => window.print()}>
                <Printer /> Print roster
              </Button>
            </>
          )
        }
      />
      {!analysis || !current ? (
        <EmptyState />
      ) : (
        <article className="grid gap-5 rounded-2xl border border-border bg-surface p-7 shadow-card print:gap-3 print:border-0 print:p-0 print:shadow-none">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5 print:pb-2">
            <div className="flex items-center gap-4">
              <img src={logo} alt="" className="h-14 w-auto rounded-lg bg-white print:h-10" />
              <div>
                <div className="font-display text-[15px] font-bold tracking-[0.14em]">WATTSOPTIMIZER</div>
                <div className="text-[13px] text-muted-foreground">
                  Generator roster · {date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </div>
              </div>
            </div>
            <ResultStatusBadge analysis={analysis} />
          </header>

          {current.input?._story && <p className="text-[13px] text-muted-foreground print:text-[10px]">{current.input._story}</p>}
          <ConflictBanner result={current.result} />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 print:grid-cols-5 print:gap-2">
            {[
              ["Total value", `${analysis.totalValue}`],
              ["Fuel used", `${analysis.totalFuel.toFixed(2)} L`],
              ["Budget", `${analysis.fuelBudget.toFixed(2)} L`],
              ["Capacity", analysis.capacityKw ? `${analysis.capacityKw} kW` : "—"],
              ["Outage hours", `${analysis.outageHours.length}`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-border px-3 py-2 print:py-0.5">
                <div className="label-caps !text-[10px]">{k}</div>
                <div className="text-lg font-black tabular print:text-[13px]">{v}</div>
              </div>
            ))}
          </div>

          <RosterTable analysis={analysis} />
          <RosterLegend />

          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12.5px] sm:grid-cols-4 print:grid-cols-6 print:text-[10px]">
            {analysis.shops.map((s) => (
              <div key={s.id} className="flex justify-between border-b border-border py-1">
                <span>{shopName(s.id)}</span>
                <span className="font-mono tabular text-muted-foreground">{s.darkHours}h dark</span>
              </div>
            ))}
          </div>

          <footer className="flex justify-between text-[11px] text-muted-foreground print:text-[9px]">
            <span>Solver: {analysis.solver}</span>
            <span>Printed from WattsOptimizer</span>
          </footer>
        </article>
      )}
    </div>
  );
}
