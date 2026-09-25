import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { listLessonsFull } from "@/lib/store";
import { distinctivePhrases } from "@/lib/insights";
import { outcomeDrivers, pearson } from "@/lib/triangulate";
import { EmptyState, PageHeader, Stat, scoreColor } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Insights · RTR" };

export default async function InsightsPage() {
  const lessons = await listLessonsFull();
  const paired = lessons.filter((l) => l.analysis && l.assessment);
  const summaries = lessons.map((l) => ({ ...l, segments: undefined }));
  const drivers = outcomeDrivers(summaries);
  const phrases = distinctivePhrases(paired);
  const r = pearson(paired.map((l) => l.analysis!.overall), paired.map((l) => l.assessment!.masteryPct));
  const demo = lessons.some((l) => l.source === "demo");

  return (
    <>
      <PageHeader eyebrow="Insights" title={<>What <span className="glow-text">actually moves</span> learning.</>} />

      {(paired.length < 10 || demo) && (
        <div className="mb-4 flex gap-3 text-sm rounded-2xl p-4 border border-amber/30 bg-amber/5 text-amber rise">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            {demo && <>Includes synthetic demo lessons, so relationships here are illustrative, not real findings. </>}
            {paired.length < 10 && <>Only {paired.length} lessons have both a transcript and outcomes — treat every number here as a hypothesis. </>}
            Correlation is not causation: a strong link may reflect class, topic or assessment difficulty rather than teaching.
          </div>
        </div>
      )}

      {paired.length < 3 ? (
        <EmptyState title="Not enough paired data yet">Upload exit-ticket results for at least three analysed lessons to unlock insights.</EmptyState>
      ) : (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 rise">
            <Stat label="Paired lessons" value={paired.length} hint="transcript + outcomes" />
            <Stat label="Delivery ↔ mastery" value={r === null ? "—" : `r = ${r}`} hint={strength(r)} accent="var(--cyan)" />
            <Stat
              label="Avg mastery"
              value={`${Math.round(paired.reduce((a, l) => a + l.assessment!.masteryPct, 0) / paired.length)}%`}
              accent="var(--pink)"
            />
            <Stat label="Teachers" value={new Set(paired.map((l) => l.teacher)).size} />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-4 mt-4 rise" style={{ animationDelay: "60ms" }}>
            <div className="glass p-5">
              <div className="eyebrow">Delivery vs mastery</div>
              <Scatter points={paired.map((l) => ({ id: l.id, title: l.title, x: l.analysis!.overall, y: l.assessment!.masteryPct }))} />
            </div>
            <div className="glass p-5">
              <div className="eyebrow">Behaviours linked to mastery</div>
              <p className="text-xs text-dim mt-1">Pearson r across paired lessons. Right = moves with higher mastery.</p>
              <div className="mt-4 flex flex-col gap-2.5">
                {drivers.map((d) => (
                  <div key={d.key} className="grid grid-cols-[1fr_130px_44px] items-center gap-3 text-xs">
                    <span className="truncate text-muted">{d.label}</span>
                    <div className="relative h-2 rounded-full bg-track">
                      <span className="absolute left-1/2 top-[-3px] bottom-[-3px] w-px bg-line-strong" />
                      {d.r !== null && (
                        <span
                          className="absolute top-0 bottom-0 rounded-full"
                          style={{
                            left: d.r >= 0 ? "50%" : `${50 + d.r * 50}%`,
                            width: `${Math.abs(d.r) * 50}%`,
                            background: d.r >= 0 ? "var(--lime)" : "var(--red)",
                          }}
                        />
                      )}
                    </div>
                    <span className="tabular-nums text-right font-mono">{d.r === null ? "—" : d.r.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-8 rise" style={{ animationDelay: "120ms" }}>
            <h2 className="text-xl font-semibold tracking-tight">What high-outcome lessons say</h2>
            <p className="text-sm text-muted mt-1">
              Teacher phrases that appear disproportionately in the top {phrases.groups.high} vs bottom {phrases.groups.low} lessons by mastery. Only phrases used across two or more subjects are shown, to filter out topic vocabulary.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <PhraseList title="More common in high-mastery lessons" color="var(--lime)" items={phrases.high} />
              <PhraseList title="More common in low-mastery lessons" color="var(--red)" items={phrases.low} />
            </div>
          </section>
        </>
      )}
    </>
  );
}

function strength(r: number | null) {
  if (r === null) return "not enough variation";
  const a = Math.abs(r);
  return a >= 0.5 ? "strong relationship" : a >= 0.3 ? "moderate relationship" : a >= 0.1 ? "weak relationship" : "no clear relationship";
}

function Scatter({ points }: { points: { id: string; title: string; x: number; y: number }[] }) {
  return (
    <div className="mt-4">
      <div className="relative aspect-[4/3] w-full rounded-xl border border-line bg-well overflow-hidden">
        <div className="absolute left-1/2 inset-y-0 w-px bg-line" />
        <div className="absolute top-1/2 inset-x-0 h-px bg-line" />
        <span className="absolute left-2 top-2 text-[10px] text-dim">outcomes beat delivery</span>
        <span className="absolute right-2 top-2 text-[10px] text-lime">aligned · strong</span>
        <span className="absolute left-2 bottom-2 text-[10px] text-dim">aligned · weak</span>
        <span className="absolute right-2 bottom-2 text-[10px] text-amber">didn&apos;t land</span>
        {points.map((p) => (
          <Link
            key={p.id}
            href={`/lessons/${p.id}`}
            title={`${p.title} — delivery ${p.x}, mastery ${p.y}%`}
            className="absolute size-3 -translate-x-1/2 translate-y-1/2 rounded-full ring-2 ring-bg hover:scale-150 transition-transform"
            style={{ left: `${4 + p.x * 0.92}%`, bottom: `${4 + p.y * 0.92}%`, background: scoreColor(p.x), boxShadow: `0 0 12px ${scoreColor(p.x)}` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-dim mt-2 font-mono">
        <span>delivery 0</span>
        <span>→ 100</span>
      </div>
    </div>
  );
}

function PhraseList({ title, color, items }: { title: string; color: string; items: { phrase: string; high: number; low: number }[] }) {
  return (
    <div className="glass p-5">
      <div className="eyebrow" style={{ color }}>
        {title}
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-muted mt-3">No distinctive phrases yet.</div>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((p) => (
            <li key={p.phrase} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">“{p.phrase}”</span>
              <span className="font-mono text-[11px] text-dim shrink-0">
                {p.high} vs {p.low}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
