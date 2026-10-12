import { Check, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Cell } from "@/lib/analytics";
import { shopName } from "@/lib/format";
import { cn } from "@/lib/utils";

const LABEL = { on: "POWERED", off: "DARK", grid: "GRID" };

export function StatusCell({ cell, shopId, compact, onSelect }: { cell: Cell; shopId: string; compact?: boolean; onSelect?: () => void }) {
  const body = (
    <button
      type="button"
      onClick={onSelect}
      disabled={cell.state === "grid"}
      aria-label={`${shopName(shopId)} ${cell.time}: ${LABEL[cell.state]}`}
      className={cn(
        "flex h-10 w-full items-center justify-center gap-1 rounded-lg border font-mono text-[9.5px] font-bold tracking-[0.1em] transition-transform duration-150 enabled:cursor-pointer enabled:hover:scale-[1.04] print:h-[22px]",
        cell.state === "on" && "cell-on",
        cell.state === "off" && "cell-off",
        cell.state === "grid" && "cell-grid",
      )}
    >
      {cell.state === "on" && <Check className="size-3.5 print:size-3" strokeWidth={3} />}
      {cell.state === "off" && <X className="size-3.5 print:size-3" strokeWidth={3} />}
      {!compact && <span className="max-xl:hidden print:hidden">{LABEL[cell.state]}</span>}
      {cell.state === "grid" && <span className="xl:hidden print:inline">GRID</span>}
    </button>
  );
  if (cell.state !== "off" || !cell.reason) return body;
  return (
    <Tooltip delayDuration={120}>
      <TooltipTrigger asChild>{body}</TooltipTrigger>
      <TooltipContent side="top">
        <div className="font-bold">
          {shopName(shopId)} dark at {cell.time}
        </div>
        <div className="mt-0.5 text-danger-ink">{cell.reason.title}</div>
        <div className="mt-1 text-muted-foreground">{cell.reason.raw}</div>
      </TooltipContent>
    </Tooltip>
  );
}
