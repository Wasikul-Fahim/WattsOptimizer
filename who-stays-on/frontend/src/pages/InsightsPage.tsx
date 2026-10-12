import { PowerSplitDonut, ReasonPie, ShopTypeDonut, ValueSharePie } from "@/components/charts/PieCharts";
import { ShopsPerHourChart, ValueByHourChart } from "@/components/charts/ValueCharts";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRoster } from "@/hooks/useRoster";

export default function InsightsPage() {
  const { analysis } = useRoster();
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Breakdown" title="Insights" />
      {!analysis ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { title: "Value share", el: <ValueSharePie analysis={analysis} /> },
              { title: "Powered vs dark", el: <PowerSplitDonut analysis={analysis} /> },
              { title: "Why shops went dark", el: <ReasonPie analysis={analysis} /> },
              { title: "Value by shop type", el: <ShopTypeDonut analysis={analysis} /> },
            ].map((c) => (
              <Card key={c.title}>
                <CardHeader>
                  <CardTitle>{c.title}</CardTitle>
                </CardHeader>
                <CardContent>{c.el}</CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Value per outage hour</CardTitle>
              </CardHeader>
              <CardContent>
                <ValueByHourChart analysis={analysis} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Shops powered each hour</CardTitle>
              </CardHeader>
              <CardContent>
                <ShopsPerHourChart analysis={analysis} height={216} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
