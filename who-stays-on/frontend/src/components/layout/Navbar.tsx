import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { ResultStatusBadge } from "@/components/common/StatusPill";
import { Button } from "@/components/ui/button";
import { useRoster } from "@/hooks/useRoster";
import { timeAgo } from "@/lib/format";
import { ThemeToggle } from "./ThemeToggle";

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function Navbar() {
  const { current, analysis, refresh, loading } = useRoster();
  const now = useClock();
  const source =
    current?.source === "preview" ? "Preview · not published" : current?.by ? `Published by ${current.by} · ${timeAgo(current.at)}` : current ? `Published · ${timeAgo(current.at)}` : "No roster loaded";

  return (
    <header className="no-print sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-6 max-md:px-4">
        <div className="flex min-w-0 items-center gap-3">
          {analysis && <ResultStatusBadge analysis={analysis} />}
          <span className="truncate text-[15.5px] text-muted-foreground">{source}</span>
        </div>
        <div className="flex-1" />
        <span className="font-mono text-[14.5px] font-medium text-muted-foreground tabular max-md:hidden">
          {now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} · {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
        <Button variant="ghost" size="icon-sm" onClick={() => void refresh()} title="Reload today's roster" aria-label="Reload today's roster">
          <RefreshCw className={loading ? "animate-spin" : ""} />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
