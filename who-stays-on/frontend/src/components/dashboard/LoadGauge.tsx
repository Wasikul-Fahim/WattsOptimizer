import { motion } from "framer-motion";

/** Semicircle gauge: value / max. Color shifts to warning above 90%. */
export function LoadGauge({ value, max, label, unit = "kW" }: { value: number; max: number; label: string; unit?: string }) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  const r = 70;
  const len = Math.PI * r;
  const hot = ratio > 0.9;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 180 104" className="w-full max-w-[220px]" role="img" aria-label={`${label}: ${value} of ${max} ${unit}`}>
        <defs>
          <linearGradient id="gauge-grad" x1="0" x2="1">
            <stop offset="0" stopColor="#00e5c3" />
            <stop offset="1" stopColor={hot ? "#ffb020" : "#00a8ff"} />
          </linearGradient>
        </defs>
        <path d={`M 20 92 A ${r} ${r} 0 0 1 160 92`} fill="none" stroke="var(--sunken)" strokeWidth="14" strokeLinecap="round" />
        <path d={`M 20 92 A ${r} ${r} 0 0 1 160 92`} fill="none" stroke="var(--border)" strokeWidth="1" />
        <motion.path
          d={`M 20 92 A ${r} ${r} 0 0 1 160 92`}
          fill="none"
          stroke="url(#gauge-grad)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={len}
          initial={{ strokeDashoffset: len }}
          animate={{ strokeDashoffset: len * (1 - ratio) }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        <text x="90" y="78" textAnchor="middle" fill="var(--foreground)" fontSize="28" fontWeight="900" fontFamily="Lato, sans-serif">
          {value}
        </text>
        <text x="90" y="96" textAnchor="middle" fill="var(--muted-foreground)" fontSize="11" fontFamily="JetBrains Mono, monospace">
          / {max} {unit}
        </text>
      </svg>
      <div className="label-caps mt-1">{label}</div>
    </div>
  );
}
