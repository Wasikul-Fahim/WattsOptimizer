import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ShopTypeDonut } from "@/components/charts/PieCharts";
import { DarkHoursChart, ShopValueChart } from "@/components/charts/ValueCharts";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ShopCard } from "@/components/shops/ShopCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRoster } from "@/hooks/useRoster";
import { shopName } from "@/lib/format";

type Sort = "value" | "dark" | "kw";

export default function ShopsPage() {
  const { analysis } = useRoster();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("value");

  const shops = useMemo(() => {
    if (!analysis) return [];
    const needle = q.trim().toLowerCase();
    return analysis.shops
      .filter((s) => !needle || shopName(s.id).toLowerCase().includes(needle) || s.id.includes(needle))
      .sort((a, b) =>
        sort === "value" ? (b.valueServed ?? 0) - (a.valueServed ?? 0) : sort === "dark" ? b.darkHours - a.darkHours : b.kw - a.kw,
      );
  }, [analysis, q, sort]);

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow={analysis ? `${analysis.shops.length} shops` : "Shops"} title="Shop analysis" />
      {!analysis ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Value earned by shop</CardTitle>
              </CardHeader>
              <CardContent>
                <ShopValueChart analysis={analysis} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Mandatory vs normal value</CardTitle>
              </CardHeader>
              <CardContent>
                <ShopTypeDonut analysis={analysis} />
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="shop-search" className="pl-9" placeholder="Search shops" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Tabs value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <TabsList>
                <TabsTrigger value="value">By value</TabsTrigger>
                <TabsTrigger value="dark">By dark hours</TabsTrigger>
                <TabsTrigger value="kw">By kW</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shops.map((s, i) => (
              <ShopCard key={s.id} shop={s} maxRun={analysis.maxConsecutiveDark} index={i} />
            ))}
          </div>
          {!shops.length && <p className="text-sm text-muted-foreground">No shop matches “{q}”.</p>}

          <Card>
            <CardHeader>
              <CardTitle>Dark hours per shop</CardTitle>
            </CardHeader>
            <CardContent>
              <DarkHoursChart analysis={analysis} />
              {analysis.maxConsecutiveDark !== null && (
                <p className="mt-3 text-[15px] text-muted-foreground">
                  Rule: no shop dark more than {analysis.maxConsecutiveDark} hours in a row. Grid hours reset the count.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
