export const HOURS = Array.from({ length: 10 }, (_, i) => `${String(10 + i).padStart(2, "0")}:00`);

/** "tailor_jamal" → "Tailor Jamal" */
export function shopName(id: string): string {
  return id
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((w) => (w.length <= 3 && w === w.toUpperCase() ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

export function litres(n: number, digits = 2): string {
  return `${n.toFixed(digits)} L`;
}

export function pct(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`;
}

/** 12:00 → "12 PM" for compact axis labels */
export function hourShort(label: string): string {
  const h = Number(label.slice(0, 2));
  if (h === 12) return "12 PM";
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

export function timeAgo(unixSeconds: number): string {
  const s = Math.max(0, Math.round(Date.now() / 1000 - unixSeconds));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(unixSeconds * 1000).toLocaleDateString();
}
