import { motion } from "framer-motion";
import { Minus, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Trend {
  dir: "up" | "down" | "flat";
  label: string;
  /** whether "up" is good (green) — e.g. fuel going up is bad */
  goodWhenUp?: boolean;
}

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  unit?: ReactNode;
  description?: ReactNode;
  trend?: Trend;
  tone?: "blue" | "teal" | "danger" | "warning";
  progress?: number; // 0..1
  index?: number;
}

const TONE = {
  blue: "bg-blue/12 text-blue-ink",
  teal: "bg-teal/12 text-teal-ink",
  danger: "bg-danger/12 text-danger-ink",
  warning: "bg-warning/14 text-warning-ink",
};

export function TrendChip({ trend }: { trend: Trend }) {
  const Icon = trend.dir === "up" ? TrendingUp : trend.dir === "down" ? TrendingDown : Minus;
  const good = trend.dir === "flat" ? null : (trend.dir === "up") === (trend.goodWhenUp ?? true);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-[3px] font-mono text-xs font-bold",
        good === null && "bg-sunken text-muted-foreground",
        good === true && "bg-success/14 text-success-ink",
        good === false && "bg-danger/12 text-danger-ink",
      )}
    >
      <Icon className="size-3.5" />
      {trend.label}
    </span>
  );
}

export function MetricCard({ icon: Icon, label, value, unit, description, trend, tone = "blue", progress, index = 0 }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-card transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-teal/50 hover:shadow-[0_0_0_1px_rgb(0_229_195/0.25),0_10px_30px_-14px_rgb(0_229_195/0.55)]"
    >
      <div className="flex items-center justify-between">
        <div className={cn("grid size-9 place-items-center rounded-[10px]", TONE[tone])}>
          <Icon className="size-[18px]" />
        </div>
        {trend && <TrendChip trend={trend} />}
      </div>
      <div className="label-caps mt-4">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1.5 text-[38.5px] font-black leading-none tracking-[-0.01em] tabular">
        {value}
        {unit && <span className="text-sm font-normal tracking-normal text-muted-foreground">{unit}</span>}
      </div>
      {progress !== undefined && (
        <div className="mt-3.5 h-1.5 overflow-hidden rounded-full border border-border bg-sunken">
          <motion.div
            className="h-full rounded-full bg-brand-gradient"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, progress * 100)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      )}
      {description && <div className="mt-2 text-[15px] text-muted-foreground">{description}</div>}
    </motion.div>
  );
}
