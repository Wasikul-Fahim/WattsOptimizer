import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
  tone: "success" | "danger" | "warning" | "blue" | "neutral";
  live?: boolean;
}

const TONE = {
  success: "text-success-ink",
  danger: "text-danger-ink",
  warning: "text-warning-ink",
  blue: "text-blue-ink",
  neutral: "text-muted-foreground",
};

export function StatusCard({ icon: Icon, label, value, detail, tone, live }: StatusCardProps) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-surface px-5 py-4 shadow-card">
      <div className={cn("grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-sunken", TONE[tone])}>
        <Icon className="size-[22px]" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="flex items-center gap-2 text-[19px] font-bold">
          <span className={cn("status-dot", TONE[tone], live && "live")} />
          <span className="truncate">{value}</span>
        </div>
        {detail && <div className="truncate text-xs text-muted-foreground">{detail}</div>}
      </div>
    </div>
  );
}
