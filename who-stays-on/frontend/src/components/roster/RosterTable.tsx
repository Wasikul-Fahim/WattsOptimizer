import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Analysis } from "@/lib/analytics";
import { HOURS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ShopRow } from "./ShopRow";

interface RosterTableProps {
  analysis: Analysis;
  onSelect?: (shopId: string, hour: number) => void;
  showSummary?: boolean;
  filter?: "all" | "mandatory" | "normal";
}

/** The roster board: one row per shop, one column per hour, load and fuel underneath. */
export function RosterTable({ analysis, onSelect, showSummary = true, filter = "all" }: RosterTableProps) {
  const shops = [...analysis.shops]
    .filter((s) => filter === "all" || s.type === filter)
    .sort((a, b) => (a.type === b.type ? 0 : a.type === "mandatory" ? -1 : 1));
  const cap = analysis.capacityKw;

  return (
    <TooltipProvider>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card print:overflow-visible print:shadow-none">
        <table className="w-full min-w-[1000px] border-separate border-spacing-1 tabular print:min-w-0 print:border-spacing-[2px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card pl-3 text-left font-mono text-[13px] font-bold tracking-[0.06em] text-muted-foreground">SHOP</th>
              {HOURS.map((h, i) => (
                <th key={h} className={cn("px-0.5 py-2 text-center font-mono text-[13px] font-bold print:py-0.5", analysis.hours[i].grid ? "text-grid-ink" : "text-foreground")}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shops.map((s) => (
              <ShopRow key={s.id} shop={s} onSelect={onSelect} />
            ))}
          </tbody>
          {showSummary && (
            <tfoot className="font-mono text-[13px] text-muted-foreground print:text-[9.5px]">
              <tr>
                <td className="sticky left-0 bg-card pl-3 pt-3 font-bold">Load / capacity</td>
                {analysis.hours.map((h) => (
                  <td key={h.hour} className="pt-3 text-center">
                    {h.grid ? (
                      "—"
                    ) : (
                      <span className={cn(cap && h.loadKw >= cap && "font-bold text-warning-ink")}>
                        {h.loadKw}
                        {cap ? `/${cap}` : ""}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="sticky left-0 bg-card pl-3 font-bold">Fuel L</td>
                {analysis.hours.map((h) => (
                  <td key={h.hour} className="text-center">
                    {h.grid ? "—" : h.fuelLitres.toFixed(2)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="sticky left-0 bg-card pb-2 pl-3 font-bold">Running total</td>
                {analysis.hours.map((h) => (
                  <td key={h.hour} className="pb-2 text-center">
                    {h.grid ? "—" : <span className={cn(h.cumulativeFuel > analysis.fuelBudget && "text-danger-ink")}>{h.cumulativeFuel.toFixed(2)}</span>}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </TooltipProvider>
  );
}

export function RosterLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-[15px] text-muted-foreground print:text-[10px]">
      <span className="inline-flex items-center gap-2">
        <i className="cell-on h-[18px] w-7 rounded-md border" /> Powered
      </span>
      <span className="inline-flex items-center gap-2">
        <i className="cell-off h-[18px] w-7 rounded-md border" /> Dark
      </span>
      <span className="inline-flex items-center gap-2">
        <i className="cell-grid h-[18px] w-7 rounded-md border" /> Grid power
      </span>
      <span className="inline-flex items-center gap-2">
        <Badge variant="mandatory">
          <Shield /> Mandatory
        </Badge>
        Always on
      </span>
    </div>
  );
}
