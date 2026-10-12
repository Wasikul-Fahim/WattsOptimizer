import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  return (
    <div className="inline-flex rounded-full border border-border bg-surface p-[3px]" role="group" aria-label="Theme">
      {(["light", "dark"] as const).map((t) => {
        const Icon = t === "light" ? Sun : Moon;
        return (
          <button
            key={t}
            onClick={() => setTheme(t)}
            aria-pressed={theme === t}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold text-muted-foreground transition-colors",
              theme === t && "bg-card text-foreground shadow-card",
            )}
          >
            <Icon className="size-4" />
            {!compact && <span className="capitalize max-md:hidden">{t}</span>}
          </button>
        );
      })}
    </div>
  );
}
