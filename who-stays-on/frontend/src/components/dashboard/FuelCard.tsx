import { Fuel } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Analysis } from "@/lib/analytics";
import { litres, pct } from "@/lib/format";
import { FuelDonut } from "@/components/charts/PieCharts";

/** Fuel tank: used vs remaining against today's budget. */
export function FuelCard({ analysis }: { analysis: Analysis }) {
  const tone = analysis.fuelUsedPct > 1 ? "text-danger-ink" : analysis.fuelUsedPct > 0.9 ? "text-warning-ink" : "text-success-ink";
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center gap-2">
        <Fuel className="size-[18px] text-blue-ink" />
        <h3 className="text-[18px] font-bold">Diesel budget</h3>
      </div>
      <FuelDonut analysis={analysis} />
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="label-caps !text-[12px]">Used</div>
          <div className="text-[18px] font-black tabular">{litres(analysis.totalFuel)}</div>
        </div>
        <div>
          <div className="label-caps !text-[12px]">Left</div>
          <div className="text-[18px] font-black tabular">{litres(analysis.fuelRemaining)}</div>
        </div>
        <div>
          <div className="label-caps !text-[12px]">Of budget</div>
          <div className={`text-[18px] font-black tabular ${tone}`}>{pct(analysis.fuelUsedPct, 1)}</div>
        </div>
      </div>
    </Card>
  );
}
