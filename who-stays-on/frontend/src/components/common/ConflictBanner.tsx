import { TriangleAlert } from "lucide-react";
import type { RosterResult } from "@/types/api";

export function ConflictBanner({ result }: { result: RosterResult }) {
  if (result.status !== "infeasible") return null;
  return (
    <div className="flex gap-3 rounded-2xl border border-danger/35 bg-danger/8 p-4">
      <TriangleAlert className="mt-0.5 size-5 shrink-0 text-danger-ink" />
      <div className="min-w-0 text-sm">
        <div className="font-bold">No roster meets every rule (rule {result.conflict.rule})</div>
        <p className="mt-0.5 text-muted-foreground">{result.conflict.message}</p>
        <p className="mt-1.5 font-mono text-[11.5px] text-danger-ink">Showing best effort: {result.best_effort_note}</p>
      </div>
    </div>
  );
}
