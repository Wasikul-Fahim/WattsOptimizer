import { motion } from "framer-motion";
import { Ban, Fuel, Gauge, HelpCircle, Scale, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DarkItem } from "@/lib/analytics";
import { shopName } from "@/lib/format";
import type { ReasonKind } from "@/lib/reasons";
import { cn } from "@/lib/utils";

const ICON: Record<ReasonKind, typeof Fuel> = {
  fuel: Fuel,
  capacity: Gauge,
  oversize: Zap,
  "zero-value": Ban,
  "trade-off": Scale,
  "best-effort": HelpCircle,
  other: HelpCircle,
};

function Stat({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div className="rounded-[10px] border border-border bg-sunken px-3 py-2">
      <div className="font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</div>
      <div className={cn("text-[20.5px] font-black tabular", tone === "danger" && "text-danger-ink")}>{value}</div>
    </div>
  );
}

/** A bar with a capacity/budget marker and the overflow hatched. */
function OverflowBar({ base, add, limit, unit }: { base: number; add: number; limit: number; unit: string }) {
  const max = Math.max(base + add, limit) || 1;
  const w = (n: number) => `${(n / max) * 100}%`;
  return (
    <div>
      <div className="relative h-2.5 rounded-full border border-border bg-sunken">
        <div className="absolute inset-y-0 left-0 rounded-full bg-brand-gradient" style={{ width: w(Math.min(base, limit)) }} />
        <div
          className="absolute inset-y-0 rounded-r-full bg-[repeating-linear-gradient(135deg,var(--color-danger)_0_4px,transparent_4px_8px)] opacity-85"
          style={{ left: w(base), width: w(add) }}
        />
        <div className="absolute -inset-y-1.5 w-0.5 bg-foreground" style={{ left: w(limit) }} />
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[13px] text-muted-foreground">
        <span>
          Would be {+(base + add).toFixed(2)} {unit}
        </span>
        <span>
          Limit {+limit.toFixed(2)} {unit}
        </span>
      </div>
    </div>
  );
}

export function ReasonCard({ item, index = 0, highlight }: { item: DarkItem; index?: number; highlight?: boolean }) {
  const r = item.reason;
  const Icon = ICON[r.kind];
  return (
    <motion.article
      id={`reason-${item.shopId}-${item.hour}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 10) * 0.03 }}
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-surface shadow-card break-inside-avoid",
        highlight && "ring-2 ring-blue",
      )}
    >
      <header className="flex items-center gap-3 border-b border-border px-5 py-3.5">
        <div className="grid size-9 place-items-center rounded-[10px] bg-danger/12 text-danger-ink">
          <Icon className="size-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[18px] font-bold">
            {shopName(item.shopId)} dark at {item.time}
          </div>
          <div className="text-xs text-muted-foreground">{r.title}</div>
        </div>
        <Badge variant="danger">Dark</Badge>
      </header>
      <div className="grid gap-3.5 px-5 py-4">
        {r.kind === "fuel" && r.loadKw !== undefined && r.dayTotalLitres !== undefined && r.budgetLitres !== undefined && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Needs" value={`+${r.shopKw} kW`} />
              <Stat label="Load" value={`${r.loadKw}→${r.newLoadKw}`} />
              <Stat label="Extra fuel" value={`+${r.extraLitres?.toFixed(2)} L`} tone="danger" />
            </div>
            <OverflowBar base={r.dayTotalLitres - (r.extraLitres ?? 0)} add={r.extraLitres ?? 0} limit={r.budgetLitres} unit="L" />
            {r.keptFor && r.keptFor.length > 0 && (
              <p className="text-[15.5px] text-muted-foreground">
                Diesel saved for{" "}
                {r.keptFor.map((k, i) => (
                  <span key={i}>
                    {i > 0 && " and "}
                    <b className="text-foreground">
                      {shopName(k.shop)} at {k.time}
                    </b>{" "}
                    (value {k.value})
                  </span>
                ))}
                .
              </p>
            )}
          </>
        )}
        {r.kind === "capacity" && r.loadKw !== undefined && r.capacityKw !== undefined && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Required" value={`${r.shopKw} kW`} />
              <Stat label="Available" value={`${Math.max(0, r.capacityKw - r.loadKw)} kW`} tone="danger" />
              <Stat label="Capacity" value={`${r.capacityKw} kW`} />
            </div>
            <OverflowBar base={r.loadKw} add={r.shopKw ?? 0} limit={r.capacityKw} unit="kW" />
          </>
        )}
        {r.kind === "oversize" && (
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Required" value={`${r.shopKw} kW`} tone="danger" />
            <Stat label="Generator" value={`${r.capacityKw} kW`} />
          </div>
        )}
        <p className="font-mono text-[14px] leading-relaxed text-muted-foreground">{r.raw}</p>
      </div>
    </motion.article>
  );
}
