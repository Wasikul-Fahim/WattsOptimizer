import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn("inline-flex rounded-full border border-border bg-surface p-[3px]", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-bold text-muted-foreground transition-colors data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-card [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}

export const TabsContent = TabsPrimitive.Content;
