import { CircleX, FileUp } from "lucide-react";
import { useState, type DragEvent } from "react";
import { cn } from "@/lib/utils";

export function JsonDropzone({ onFile, compact, id = "file-input" }: { onFile: (f: File) => void; compact?: boolean; id?: string }) {
  const [dragging, setDragging] = useState(false);
  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  }
  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "flex cursor-pointer flex-col items-center rounded-2xl border-[1.5px] border-dashed border-blue/45 bg-blue/4 px-6 text-center transition-colors hover:border-teal hover:bg-teal/8",
        compact ? "py-8" : "py-12",
        dragging && "border-teal bg-teal/10",
      )}
    >
      <div className="grid size-14 place-items-center rounded-2xl bg-brand-gradient text-[#05222f]">
        <FileUp className="size-6" />
      </div>
      <div className="mt-3 text-[19px] font-bold">Drop market JSON here</div>
      <div className="text-[15.5px] text-muted-foreground">or click to browse · .json up to 64 KB</div>
      <input
        id={id}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}

export function InputProblem({ problem }: { problem: { field: string; message: string } }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-danger/35 bg-danger/8 p-4 text-sm">
      <CircleX className="mt-0.5 size-5 shrink-0 text-danger-ink" />
      <div>
        <div className="font-bold">Can't use this file</div>
        <div className="mt-0.5 text-muted-foreground">
          <span className="font-mono text-danger-ink">{problem.field}</span>: {problem.message}
        </div>
      </div>
    </div>
  );
}
