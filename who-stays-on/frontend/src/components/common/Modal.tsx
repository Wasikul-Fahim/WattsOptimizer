import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel?: string;
  confirmVariant?: "primary" | "danger";
  onConfirm?: () => void;
  busy?: boolean;
}

export function Modal({ open, onOpenChange, title, description, children, confirmLabel, confirmVariant = "primary", onConfirm, busy }: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
        {children && <div className="mt-4">{children}</div>}
        {onConfirm && (
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant={confirmVariant} onClick={onConfirm} loading={busy}>
              {confirmLabel ?? "Confirm"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
