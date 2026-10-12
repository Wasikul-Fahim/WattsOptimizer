import { useMemo, useState } from "react";
import { ReasonPie } from "@/components/charts/PieCharts";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ReasonCard } from "@/components/reasons/ReasonCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRoster } from "@/hooks/useRoster";
import { REASON_LABEL, type ReasonKind } from "@/lib/reasons";
import { cn } from "@/lib/utils";

export default function ReasonsPage() {
  const { analysis } = useRoster();
  const [kind, setKind] = useState<ReasonKind | "all">("all");
  const [hour, setHour] = useState<number | "all" | null>(null);
  const activeHour = hour ?? analysis?.outageHours[0] ?? "all";

  const items = useMemo(
    () =>
      (analysis?.darkItems ?? [])
        .filter((d) => (kind === "all" || d.reason.kind === kind) && (activeHour === "all" || d.hour === activeHour))
        .sort((a, b) => a.hour - b.hour || a.shopId.localeCompare(b.shopId)),
    [analysis, kind, activeHour],
  );

  const chip = (active: boolean) =>
    cn(
      "cursor-pointer rounded-full border px-3 py-1.5 text-[15px] font-bold transition-colors",
      active ? "border-blue bg-blue/12 text-blue-ink" : "border-border bg-surface text-muted-foreground hover:text-foreground",
    );

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow={analysis ? `${analysis.darkItems.length} dark shop-hours` : "Reasons"} title="Power-cut reasons" />
      {!analysis ? (
        <EmptyState />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              <button className={chip(activeHour === "all")} onClick={() => setHour("all")}>
                All hours
              </button>
              {analysis.outageHours.map((h) => (
                <button key={h} className={chip(activeHour === h)} onClick={() => setHour(h)}>
                  {analysis.hours[h].time} · {analysis.hours[h].darkCount}
                </button>
              ))}
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {items.map((d, i) => (
                <ReasonCard key={`${d.shopId}-${d.hour}`} item={d} index={i} />
              ))}
            </div>
            {!items.length && <p className="text-sm text-muted-foreground">No dark shops match this filter.</p>}
          </div>
          <div className="grid gap-4 lg:sticky lg:top-24">
            <Card>
              <CardHeader>
                <CardTitle>Causes</CardTitle>
              </CardHeader>
              <CardContent>
                <ReasonPie analysis={analysis} />
              </CardContent>
            </Card>
            <div className="flex flex-wrap gap-2">
              <button className={chip(kind === "all")} onClick={() => setKind("all")}>
                All causes
              </button>
              {(Object.keys(REASON_LABEL) as ReasonKind[])
                .filter((k) => analysis.reasonCounts[k] > 0)
                .map((k) => (
                  <button key={k} className={chip(kind === k)} onClick={() => setKind(k)}>
                    {REASON_LABEL[k]} · {analysis.reasonCounts[k]}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
