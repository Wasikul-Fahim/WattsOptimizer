import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "size-11 animate-spin rounded-full bg-[conic-gradient(from_0deg,transparent_0_25%,#00e5c3_60%,#00a8ff)] [mask:radial-gradient(farthest-side,transparent_calc(100%-4px),#000_calc(100%-4px))]",
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

export function Loader({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <Spinner />
      <div className="grid flex-1 gap-2">
        <div className="text-sm font-bold">{label}</div>
        <div className="h-3 w-4/5 animate-pulse rounded-md bg-sunken" />
        <div className="h-3 w-1/2 animate-pulse rounded-md bg-sunken" />
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl border border-border bg-surface", className)} />;
}
