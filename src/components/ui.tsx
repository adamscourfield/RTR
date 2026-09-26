import type { ReactNode } from "react";
import { LEVEL_NAMES } from "@/lib/rubric";

export function scoreColor(pct: number) {
  if (pct >= 75) return "var(--lime)";
  if (pct >= 55) return "var(--cyan)";
  if (pct >= 35) return "var(--amber)";
  return "var(--red)";
}

export function levelColor(level: number) {
  return ["var(--red)", "var(--amber)", "var(--cyan)", "var(--lime)"][Math.max(0, Math.min(3, Math.round(level) - 1))];
}

export function ScoreRing({ value, size = 140, stroke = 10, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = scoreColor(value);
  const id = `ring-${size}-${value}`;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="var(--violet)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * c} ${c}`}
          style={{ filter: `drop-shadow(0 2px 6px color-mix(in srgb, ${color} 45%, transparent))`, transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-semibold tracking-tight tabular-nums" style={{ fontSize: size * 0.28 }}>
            {value}
          </div>
          {label && <div className="eyebrow !text-[9px] -mt-0.5">{label}</div>}
        </div>
      </div>
    </div>
  );
}

export function LevelBar({ score }: { score: number }) {
  return (
    <div className="flex gap-1" title={`${LEVEL_NAMES[score - 1]} (${score}/4)`}>
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="h-1.5 flex-1 rounded-full"
          style={{
            background: i <= score ? levelColor(score) : "var(--track)",
            boxShadow: i <= score ? `0 0 10px -2px ${levelColor(score)}` : undefined,
          }}
        />
      ))}
    </div>
  );
}

export function Stat({ label, value, hint, accent }: { label: string; value: ReactNode; hint?: ReactNode; accent?: string }) {
  return (
    <div className="glass p-4 sm:p-5 min-w-0">
      <div className="eyebrow truncate">{label}</div>
      <div className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums" style={{ color: accent }}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 rise">
      <div className="min-w-0">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

/** Minimal line/area chart for a series of 0–100 values. */
export function TrendChart({
  series,
  height = 160,
}: {
  series: { label: string; color: string; values: (number | null)[] }[];
  height?: number;
}) {
  const w = 600;
  const pad = 8;
  const n = Math.max(...series.map((s) => s.values.length), 2);
  const x = (i: number) => pad + (i / (n - 1)) * (w - pad * 2);
  const y = (v: number) => pad + (1 - v / 100) * (height - pad * 2);
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none" aria-hidden>
        {[25, 50, 75].map((g) => (
          <line key={g} x1={0} x2={w} y1={y(g)} y2={y(g)} stroke="var(--track)" strokeDasharray="4 6" />
        ))}
        {series.map((s, si) => {
          const pts = s.values.map((v, i) => (v === null ? null : ([x(i), y(v)] as const))).filter(Boolean) as [number, number][];
          if (pts.length < 2) return null;
          const d = pts.map(([px, py], i) => `${i ? "L" : "M"}${px},${py}`).join(" ");
          const gid = `trend-${si}`;
          return (
            <g key={s.label}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={si === 0 ? 0.25 : 0} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <path d={`${d} L${pts[pts.length - 1][0]},${height} L${pts[0][0]},${height} Z`} fill={`url(#${gid})`} />
              <path
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                strokeDasharray={si === 0 ? undefined : "5 5"}
              />
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-4 mt-3">
        {series.map((s, i) => (
          <span key={s.label} className="flex items-center gap-2 text-xs text-muted">
            <span className="w-4 h-0.5 rounded" style={{ background: s.color, opacity: i === 0 ? 1 : 0.8 }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="glass p-10 text-center">
      <div className="text-lg font-medium">{title}</div>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDuration(sec: number) {
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
}
