import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold transition-[transform,box-shadow,background-color,border-color,color] duration-200 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-[18px] [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-gradient text-[#05222f] shadow-[0_6px_18px_-8px_rgba(0,168,255,.7)] hover:shadow-[0_8px_26px_-6px_rgba(0,229,195,.65)]",
        secondary: "border border-border bg-surface text-foreground hover:border-blue hover:text-blue-ink",
        ghost: "text-foreground hover:bg-sunken",
        danger: "border border-danger/30 bg-danger/12 text-danger-ink hover:bg-danger/20",
      },
      size: {
        sm: "h-8 rounded-lg px-3 text-[15.5px]",
        md: "h-10 rounded-[10px] px-4.5 text-sm",
        lg: "h-12 rounded-xl px-6 text-[18px]",
        icon: "size-10 rounded-[10px]",
        "icon-sm": "size-8 rounded-lg [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
        {asChild ? (
          children
        ) : (
          <>
            {loading && <span className="size-4 animate-spin rounded-full border-2 border-current/25 border-t-current" aria-hidden />}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";
export { buttonVariants };
