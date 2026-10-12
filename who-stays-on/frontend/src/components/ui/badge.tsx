import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex h-[22px] items-center gap-1.5 rounded-md border px-2 font-mono text-[12.5px] font-bold uppercase tracking-[0.1em] whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      variant: {
        mandatory: "border-blue/40 bg-blue/10 text-blue-ink",
        success: "border-success/45 bg-success/10 text-success-ink",
        danger: "border-danger/40 bg-danger/8 text-danger-ink",
        warning: "border-warning/45 bg-warning/10 text-warning-ink",
        neutral: "border-border bg-sunken text-muted-foreground",
        teal: "border-teal/45 bg-teal/10 text-teal-ink",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
