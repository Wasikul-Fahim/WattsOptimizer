import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

/** The logo's navy "O" disappears on dark surfaces, so it always sits on a white plate. */
export function LogoMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <span className={cn("inline-flex items-center rounded-[10px] border border-border bg-white px-1", className)}>
      <img src={logo} alt="WattsOptimizer" style={{ height: size, width: "auto" }} draggable={false} />
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col leading-none", className)}>
      <span className="font-display text-[14px] font-bold tracking-[0.14em]">WATTSOPTIMIZER</span>
      <span className="mt-1 text-[11.5px] text-muted-foreground">Smart Energy Allocation System</span>
    </div>
  );
}
