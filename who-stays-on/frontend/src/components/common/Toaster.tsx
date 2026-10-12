import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, CircleCheck, CircleX, Info, X } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

const ICON = { success: CircleCheck, error: CircleX, warning: CircleAlert, info: Info };
const TONE = {
  success: "border-l-success [&_.ic]:text-success-ink",
  error: "border-l-danger [&_.ic]:text-danger-ink",
  warning: "border-l-warning [&_.ic]:text-warning-ink",
  info: "border-l-blue [&_.ic]:text-blue-ink",
};

export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="no-print pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(360px,calc(100vw-32px))] flex-col gap-2.5" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = ICON[t.kind];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.2 }}
              className={cn("pointer-events-auto flex items-start gap-3 rounded-xl border border-l-[3px] border-border bg-card px-3.5 py-3 shadow-card", TONE[t.kind])}
            >
              <Icon className="ic mt-0.5 size-[18px] shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-bold">{t.title}</div>
                {t.description && <div className="mt-0.5 break-words text-[12.5px] text-muted-foreground">{t.description}</div>}
              </div>
              <button className="cursor-pointer rounded p-0.5 text-muted-foreground hover:text-foreground" onClick={() => dismiss(t.id)} aria-label="Dismiss">
                <X className="size-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
