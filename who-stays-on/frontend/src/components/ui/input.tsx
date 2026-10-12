import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-10 w-full rounded-[10px] border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-blue focus:shadow-[0_0_0_3px_rgb(0_168_255/0.2)] focus:outline-none",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-xl border border-border bg-sunken p-3 font-mono text-[12.5px] leading-relaxed text-foreground focus:border-blue focus:shadow-[0_0_0_3px_rgb(0_168_255/0.2)] focus:outline-none",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-[12.5px] text-muted-foreground", className)} {...props} />;
}
