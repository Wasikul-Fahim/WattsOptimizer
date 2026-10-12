import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

// Native <dialog>: focus trap, Escape and backdrop come from the browser, and nothing injects
// inline <style> tags (the backend CSP only allows same-origin stylesheets).

const DialogCtx = React.createContext<{ open: boolean; onOpenChange: (open: boolean) => void }>({ open: false, onOpenChange: () => {} });

export function Dialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }) {
  return <DialogCtx.Provider value={{ open, onOpenChange }}>{children}</DialogCtx.Provider>;
}

export function DialogContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open, onOpenChange } = React.useContext(DialogCtx);
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onOpenChange(false);
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false); // click on the backdrop
      }}
      className={cn(
        "m-auto w-[calc(100vw-32px)] max-w-lg rounded-2xl border border-border bg-surface p-0 text-foreground shadow-card backdrop:bg-black/45 backdrop:backdrop-blur-sm",
        className,
      )}
    >
      {open && (
        <div className="relative p-6">
          {children}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 cursor-pointer rounded-lg p-1 text-muted-foreground hover:bg-sunken"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </dialog>
  );
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("pr-8 text-lg font-black", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-sm text-muted-foreground", className)} {...props} />;
}
