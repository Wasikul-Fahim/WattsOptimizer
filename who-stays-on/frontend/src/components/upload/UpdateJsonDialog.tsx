import { FlaskConical, Zap } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useJsonInput } from "@/hooks/useJsonInput";
import { useOptimization } from "@/hooks/useOptimization";
import { useToast } from "@/hooks/useToast";
import { InputSummary } from "./InputSummary";
import { InputProblem, JsonDropzone } from "./JsonDropzone";

/** Dashboard shortcut: load a new market JSON and publish today's roster without leaving the page. */
export function UpdateJsonDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const { optimize, running, reset } = useOptimization();
  const { input, name, problem, readFile, loadSample, clear } = useJsonInput(reset);
  const [serverError, setServerError] = useState<string | null>(null);

  function close(o: boolean) {
    if (!o) {
      clear();
      setServerError(null);
    }
    onOpenChange(o);
  }

  async function publish() {
    if (!input) return;
    setServerError(null);
    const res = await optimize(input, { publish: true });
    if (!res) return;
    if (res.status === "invalid_input") {
      setServerError(res.message);
      return;
    }
    if (res.status === "ok") toast({ kind: "success", title: "Roster updated", description: `${res.total_value} value · ${res.total_fuel_litres.toFixed(2)} L used` });
    else toast({ kind: "warning", title: "No roster meets every rule", description: res.conflict.message });
    close(false);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-xl">
        <DialogTitle>Update JSON</DialogTitle>
        <DialogDescription>Load today's market data and publish a new roster.</DialogDescription>
        <div className="mt-5 grid gap-4">
          {input ? <InputSummary input={input} name={name} /> : <JsonDropzone onFile={readFile} compact id="dialog-file-input" />}
          {problem && <InputProblem problem={problem} />}
          {serverError && <InputProblem problem={{ field: "server", message: serverError }} />}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          {input ? (
            <Button variant="ghost" size="sm" onClick={clear}>
              Choose another file
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={loadSample}>
              <FlaskConical /> Practice input
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!input} loading={running} onClick={() => void publish()}>
              {!running && <Zap />} Run & publish
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
