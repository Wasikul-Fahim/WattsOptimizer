import { ArrowRight, CircleCheck, CircleX, ClipboardPaste, FileUp, FlaskConical, RotateCcw, TriangleAlert, Zap } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { InputSummary } from "@/components/upload/InputSummary";
import { InputProblem, JsonDropzone } from "@/components/upload/JsonDropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useJsonInput } from "@/hooks/useJsonInput";
import { useOptimization } from "@/hooks/useOptimization";
import { useToast } from "@/hooks/useToast";
import { HOURS } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MarketInput } from "@/types/api";

export default function UploadPage() {
  const { toast } = useToast();
  const { optimize, running, response, error, reset } = useOptimization();
  const { input, setInput, original, name, problem, accept, readFile, loadSample } = useJsonInput(reset);
  const [paste, setPaste] = useState("");

  async function run(publish: boolean) {
    if (!input) return;
    const res = await optimize(input, { publish });
    if (!res) return;
    if (res.status === "ok") toast({ kind: "success", title: publish ? "Roster published" : "Preview ready", description: `${res.total_value} value · ${res.total_fuel_litres.toFixed(2)} L used` });
    else if (res.status === "infeasible") toast({ kind: "warning", title: "No roster meets every rule", description: res.conflict.message });
    else toast({ kind: "error", title: "Input rejected", description: res.message });
  }

  const edit = (patch: Partial<MarketInput>) => {
    reset();
    setInput((cur) => (cur ? { ...cur, ...patch } : cur));
  };
  // The backend requires the fuel table's top level to equal capacity, so it moves with it.
  const setCapacity = (kw: number) => {
    if (!input) return;
    const table = input.fuel_table.map((row, i, all) => (i === all.length - 1 ? { ...row, load_kw: kw } : row));
    edit({ generator_capacity_kw: kw, fuel_table: table });
  };
  const changed = input && original && JSON.stringify(input) !== JSON.stringify(original);

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Secretary" title="Upload market data" />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid gap-6">
          <Tabs defaultValue="file">
            <TabsList>
              <TabsTrigger value="file">
                <FileUp /> Upload file
              </TabsTrigger>
              <TabsTrigger value="paste">
                <ClipboardPaste /> Paste JSON
              </TabsTrigger>
            </TabsList>
            <TabsContent value="file" className="mt-4">
              <JsonDropzone onFile={readFile} />
              <div className="mt-3 flex justify-center">
                <Button variant="ghost" size="sm" onClick={loadSample}>
                  <FlaskConical /> Load practice input
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="paste" className="mt-4 grid gap-3">
              <Textarea id="paste-json" rows={14} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder='{ "grid_available": [true, true, false, …], "shops": [ … ] }' spellCheck={false} />
              <div className="flex justify-end">
                <Button variant="secondary" onClick={() => accept(paste, "Pasted JSON")} disabled={!paste.trim()}>
                  <CircleCheck /> Check JSON
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {problem && <InputProblem problem={problem} />}

          {input && (
            <Card>
              <CardContent>
                <InputSummary input={input} name={name} />
              </CardContent>
            </Card>
          )}

          {response && (
            <Card className={cn(response.status === "ok" ? "border-success/45" : response.status === "infeasible" ? "border-warning/50" : "border-danger/40")}>
              <CardContent className="flex flex-wrap items-center gap-4">
                {response.status === "ok" && <CircleCheck className="size-8 text-success-ink" />}
                {response.status === "infeasible" && <TriangleAlert className="size-8 text-warning-ink" />}
                {response.status === "invalid_input" && <CircleX className="size-8 text-danger-ink" />}
                <div className="min-w-0 flex-1">
                  {response.status === "invalid_input" ? (
                    <>
                      <div className="font-bold">Server rejected the input</div>
                      <div className="text-[15.5px] text-muted-foreground">{response.message}</div>
                    </>
                  ) : (
                    <>
                      <div className="font-bold">{response.status === "ok" ? "Roster ready" : "Infeasible · best effort attached"}</div>
                      <div className="text-[15.5px] text-muted-foreground tabular">
                        Value {response.total_value} · Fuel {response.total_fuel_litres.toFixed(2)} / {response.fuel_budget_litres.toFixed(2)} L
                      </div>
                    </>
                  )}
                </div>
                {response.status !== "invalid_input" && (
                  <Button variant="primary" asChild>
                    <Link to="/">
                      Open dashboard <ArrowRight />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
          {error && <p className="text-sm text-danger-ink">{error}</p>}
        </div>

        <Card className="lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle>What-if</CardTitle>
            {changed && (
              <Button variant="ghost" size="sm" onClick={() => original && setInput(structuredClone(original))}>
                <RotateCcw /> Reset
              </Button>
            )}
          </CardHeader>
          <CardContent className="grid gap-4">
            {!input ? (
              <p className="text-[15.5px] text-muted-foreground">Load an input to adjust capacity, fuel or the grid schedule before running.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="cap">Capacity kW</Label>
                    <Input id="cap" type="number" min={1} value={input.generator_capacity_kw} onChange={(e) => setCapacity(Number(e.target.value))} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="budget">Diesel L</Label>
                    <Input id="budget" type="number" min={0} step={0.1} value={input.fuel_budget_litres} onChange={(e) => edit({ fuel_budget_litres: Number(e.target.value) })} />
                  </div>
                </div>
                <p className="-mt-2 text-[14px] text-muted-foreground">Top fuel level follows capacity.</p>
                <div className="grid gap-1.5">
                  <Label htmlFor="maxdark">Max dark hours in a row</Label>
                  <Input id="maxdark" type="number" min={0} max={10} value={input.max_consecutive_dark} onChange={(e) => edit({ max_consecutive_dark: Number(e.target.value) })} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Grid schedule · tap to flip</Label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {input.grid_available.map((g, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => edit({ grid_available: input.grid_available.map((x, j) => (j === i ? !x : x)) })}
                        className={cn("cursor-pointer rounded-lg border py-2 font-mono text-[12.5px] font-bold", g ? "cell-grid" : "cell-off")}
                        aria-pressed={!g}
                        title={g ? "Grid on" : "Outage"}
                      >
                        {HOURS[i]}
                      </button>
                    ))}
                  </div>
                  <div className="text-[14px] text-muted-foreground">Red = outage, gray = grid</div>
                </div>
              </>
            )}
            <div className="grid gap-2 border-t border-border pt-4">
              <Button variant="primary" size="lg" disabled={!input} loading={running} onClick={() => void run(true)}>
                {!running && <Zap />} Run & publish
              </Button>
              <Button variant="secondary" disabled={!input || running} onClick={() => void run(false)}>
                Preview only
              </Button>
              <p className="text-center text-[14px] text-muted-foreground">Publishing makes it today's roster for all committees.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
