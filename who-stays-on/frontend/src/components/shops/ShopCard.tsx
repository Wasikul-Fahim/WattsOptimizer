import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ShopView } from "@/lib/analytics";
import { shopName } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ShopCard({ shop, maxRun, index = 0 }: { shop: ShopView; maxRun: number | null; index?: number }) {
  const outage = shop.poweredHours + shop.darkHours;
  const uptime = outage ? shop.poweredHours / outage : 1;
  const status = shop.type === "mandatory" ? "Always on" : shop.darkHours === 0 ? "Fully powered" : uptime >= 0.5 ? "Shared" : "Mostly dark";
  const statusVariant = shop.type === "mandatory" || shop.darkHours === 0 ? "success" : uptime >= 0.5 ? "warning" : "danger";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="rounded-2xl border border-border bg-surface p-5 shadow-card transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-teal/50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-[16px] font-black">{shopName(shop.id)}</h3>
          <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{shop.id}</div>
        </div>
        {shop.type === "mandatory" ? (
          <Badge variant="mandatory">
            <Shield /> Mandatory
          </Badge>
        ) : (
          <Badge variant="neutral">Normal</Badge>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div>
          <div className="label-caps !text-[10px]">Power</div>
          <div className="text-lg font-black tabular">
            {shop.kw}
            <span className="ml-0.5 text-xs font-normal text-muted-foreground">kW</span>
          </div>
        </div>
        <div>
          <div className="label-caps !text-[10px]">Value</div>
          <div className="text-lg font-black tabular">{shop.valueServed ?? "—"}</div>
        </div>
        <div>
          <div className="label-caps !text-[10px]">Dark</div>
          <div className={cn("text-lg font-black tabular", shop.darkHours > 0 && "text-danger-ink")}>
            {shop.darkHours}
            <span className="ml-0.5 text-xs font-normal text-muted-foreground">h</span>
          </div>
        </div>
      </div>

      {/* Mini timeline of outage hours */}
      <div className="mt-4 flex gap-1" aria-label="Hour by hour">
        {shop.cells.map((c) => (
          <div
            key={c.hour}
            title={`${c.time} · ${c.state}`}
            className={cn("h-2 flex-1 rounded-full border", c.state === "on" && "cell-on", c.state === "off" && "cell-off", c.state === "grid" && "cell-grid")}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-[12px]">
        <Badge variant={statusVariant}>{status}</Badge>
        <span className="text-muted-foreground">
          Longest dark run <b className="text-foreground tabular">{shop.longestDarkRun}h</b>
          {maxRun !== null && shop.type === "normal" && <span> / {maxRun} max</span>}
        </span>
      </div>
      {shop.valueDemand !== null && shop.valueDemand > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-[11.5px] text-muted-foreground">
            <span>Value captured</span>
            <span className="font-mono tabular">
              {shop.valueServed}/{shop.valueDemand}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sunken">
            <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${((shop.valueServed ?? 0) / shop.valueDemand) * 100}%` }} />
          </div>
        </div>
      )}
    </motion.div>
  );
}
