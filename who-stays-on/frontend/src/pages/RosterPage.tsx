import { Printer } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ShopsPerHourChart } from "@/components/charts/ValueCharts";
import { ConflictBanner } from "@/components/common/ConflictBanner";
import { EmptyState } from "@/components/common/EmptyState";
import { Modal } from "@/components/common/Modal";
import { PageHeader } from "@/components/common/PageHeader";
import { ReasonCard } from "@/components/reasons/ReasonCard";
import { RosterLegend, RosterTable } from "@/components/roster/RosterTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRoster } from "@/hooks/useRoster";

export default function RosterPage() {
  const { analysis, current } = useRoster();
  const [filter, setFilter] = useState<"all" | "mandatory" | "normal">("all");
  const [selected, setSelected] = useState<{ shopId: string; hour: number } | null>(null);
  const item = selected && analysis?.darkItems.find((d) => d.shopId === selected.shopId && d.hour === selected.hour);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Hourly schedule"
        title="Roster board"
        actions={
          <Button variant="secondary" asChild>
            <Link to="/report">
              <Printer /> Print view
            </Link>
          </Button>
        }
      />
      {!analysis || !current ? (
        <EmptyState />
      ) : (
        <>
          <ConflictBanner result={current.result} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <TabsList>
                <TabsTrigger value="all">All shops</TabsTrigger>
                <TabsTrigger value="mandatory">Mandatory</TabsTrigger>
                <TabsTrigger value="normal">Normal</TabsTrigger>
              </TabsList>
            </Tabs>
            <RosterLegend />
          </div>
          <RosterTable analysis={analysis} filter={filter} onSelect={(shopId, hour) => setSelected({ shopId, hour })} />
          <p className="text-[15px] text-muted-foreground">Hover or click a dark cell to see why.</p>
          <Card>
            <CardHeader>
              <CardTitle>Shops powered each hour</CardTitle>
            </CardHeader>
            <CardContent>
              <ShopsPerHourChart analysis={analysis} />
            </CardContent>
          </Card>
          <Modal open={!!item} onOpenChange={(o) => !o && setSelected(null)} title="Why is this shop dark?">
            {item && <ReasonCard item={item} />}
          </Modal>
        </>
      )}
    </div>
  );
}
