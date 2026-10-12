import { ArrowRight, CircleCheck, CircleX, ClipboardPaste, FileJson, FileUp, FlaskConical, RotateCcw, TriangleAlert, Zap } from "lucide-react";
import { useCallback, useRef, useState, type DragEvent } from "react";
import { Link } from "react-router-dom";
import sample from "@/assets/sample_input.json";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOptimization } from "@/hooks/useOptimization";
import { useToast } from "@/hooks/useToast";
import { HOURS } from "@/lib/format";
import { parseInputText } from "@/lib/validate";
import { cn } from "@/lib/utils";
import type { MarketInput } from "@/types/api";

const MAX_BYTES = 64 * 1024;

function InputSummary({ input, name }: { input: MarketInput; name: string }) {
  const outages = input.grid_available.filter((g) => !g).length;
  const demand = input.shops.reduce((a, s) => a + s.kw, 0);
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2 text-sm font-bold">
        <FileJson className="size-4 text-blue-ink" /> {name}
      </div>
      {input._story && <p className="text-[13px] text-muted-foreground">{input._story}</p>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Shops", input.shops.length],
          ["Outage hours", outages],
          ["Capacity", `${input.generator_capacity_kw} kW`],
          ["Demand", `${demand} kW`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-border bg-sunken px-3 py-2">
            <div className="label-caps !text-[10px]">{k}</div>
            <div className="text-lg font-black tabular">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function UploadPage() {
  const { toast } = useToast();
  const { optimize, running, response, error, reset } = useOptimization();
  const [input, setInput] = useState<MarketInput | null>(null);
  const [original, setOriginal] = useState<MarketInput | null>(null);
  const [name, setName] = useState("");
  const [paste, setPaste] = useState("");
  const [problem, setProblem] = useState<{ field: string; message: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const accept = useCallback(
    (text: string, label: string) => {
      reset();
      const checked = parseInputText(text);
      if (!checked.ok) {
        setProblem({ field: checked.field, message: checked.message });
        setInput(null);
        return;
      }
      setProblem(null);
      setInput(checked.input);
      setOriginal(structuredClone(checked.input));
      setName(label);
    },
    [reset],
  );

  const readFile = useCallback(
    (file: File) => {
      if (!/\.json$/i.test(file.name) && file.type !== "application/json") {
        setProblem({ field: "file", message: `${file.name} is not a .json file` });
        return;
      }
      if (file.size > MAX_BYTES) {
        setProblem({ field: "file", message: `File is ${(file.size / 1024).toFixed(0)} KB; the limit is 64 KB` });
        return;
      }
      file.text().then((t) => accept(t, file.name));
    },
    [accept],
  );

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) readFile(f);
  }

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

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
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
              <label
                htmlFor="file-input"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  "flex cursor-pointer flex-col items-center rounded-2xl border-[1.5px] border-dashed border-blue/45 bg-blue/4 px-6 py-12 text-center transition-colors hover:border-teal hover:bg-teal/8",
                  dragging && "border-teal bg-teal/10",
                )}
              >
                <div className="grid size-14 place-items-center rounded-2xl bg-brand-gradient text-[#05222f]">
                  <FileUp className="size-6" />
                </div>
                <div className="mt-3 text-[16px] font-bold">Drop market JSON here</div>
                <div className="text-[13px] text-muted-foreground">or click to browse · .json up to 64 KB</div>
                <input
                  ref={fileRef}
                  id="file-input"
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) readFile(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <div className="mt-3 flex justify-center">
                <Button variant="ghost" size="sm" onClick={() => accept(JSON.stringify(sample), "sample_input.json (practice)")}>
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

          {problem && (
            <div className="flex gap-3 rounded-2xl border border-danger/35 bg-danger/8 p-4 text-sm">
              <CircleX className="mt-0.5 size-5 shrink-0 text-danger-ink" />
              <div>
                <div className="font-bold">Can't use this file</div>
                <div className="mt-0.5 text-muted-foreground">
                  <span className="font-mono text-danger-ink">{problem.field}</span>: {problem.message}
                </div>
              </div>
            </div>
          )}

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
                      <div className="text-[13px] text-muted-foreground">{response.message}</div>
                    </>
                  ) : (
                    <>
                      <div className="font-bold">{response.status === "ok" ? "Roster ready" : "Infeasible · best effort attached"}</div>
                      <div className="text-[13px] text-muted-foreground tabular">
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
              <p className="text-[13px] text-muted-foreground">Load an input to adjust capacity, fuel or the grid schedule before running.</p>
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
                <p className="-mt-2 text-[11.5px] text-muted-foreground">Top fuel level follows capacity.</p>
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
                        className={cn("cursor-pointer rounded-lg border py-2 font-mono text-[10.5px] font-bold", g ? "cell-grid" : "cell-off")}
                        aria-pressed={!g}
                        title={g ? "Grid on" : "Outage"}
                      >
                        {HOURS[i]}
                      </button>
                    ))}
                  </div>
                  <div className="text-[11.5px] text-muted-foreground">Red = outage, gray = grid</div>
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
              <p className="text-center text-[11.5px] text-muted-foreground">Publishing makes it today's roster for all committees.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
