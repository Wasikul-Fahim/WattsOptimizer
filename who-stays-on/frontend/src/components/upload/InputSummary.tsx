import { FileJson } from "lucide-react";
import type { MarketInput } from "@/types/api";

export function InputSummary({ input, name }: { input: MarketInput; name: string }) {
  const outages = input.grid_available.filter((g) => !g).length;
  const demand = input.shops.reduce((a, s) => a + s.kw, 0);
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2 text-sm font-bold">
        <FileJson className="size-4 text-blue-ink" /> {name}
      </div>
      {input._story && <p className="text-[15.5px] text-muted-foreground">{input._story}</p>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Shops", input.shops.length],
          ["Outage hours", outages],
          ["Capacity", `${input.generator_capacity_kw} kW`],
          ["Demand", `${demand} kW`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-border bg-sunken px-3 py-2">
            <div className="label-caps !text-[12px]">{k}</div>
            <div className="text-lg font-black tabular">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
