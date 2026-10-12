import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, actions, className }: { eyebrow?: string; title: string; actions?: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-4 ${className ?? ""}`}>
      <div className="min-w-0">
        {eyebrow && <div className="label-caps !text-blue-ink">{eyebrow}</div>}
        <h1 className="mt-1.5 text-[31px] font-black leading-tight tracking-[-0.01em]">{title}</h1>
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
