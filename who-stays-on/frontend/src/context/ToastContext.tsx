import { createContext, useCallback, useMemo, useState, type ReactNode } from "react";

export type ToastKind = "success" | "error" | "warning" | "info";
export interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
}

export const ToastContext = createContext<{
  toasts: ToastItem[];
  toast: (t: Omit<ToastItem, "id">) => void;
  dismiss: (id: number) => void;
} | null>(null);

let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);
  const toast = useCallback(
    (t: Omit<ToastItem, "id">) => {
      const id = ++seq;
      setToasts((ts) => [...ts.slice(-3), { ...t, id }]);
      window.setTimeout(() => dismiss(id), t.kind === "error" ? 7000 : 4500);
    },
    [dismiss],
  );
  const value = useMemo(() => ({ toasts, toast, dismiss }), [toasts, toast, dismiss]);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}
