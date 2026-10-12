import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

/** The logo on a transparent background, square and never stretched. */
export function LogoMark({ className, size = 54 }: { className?: string; size?: number }) {
  return (
    <img
      src={logo}
      alt="WattsOptimizer"
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col leading-none", className)}>
      <span className="font-display text-[17px] font-bold tracking-[0.14em]">WATTSOPTIMIZER</span>
      <span className="mt-1 text-[14px] text-muted-foreground">Smart Energy Allocation System</span>
    </div>
  );
}
