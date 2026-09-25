import { QTYPE_COLOR } from "@/lib/qtype";
import { formatClock } from "@/lib/transcript";
import type { ClassifiedQuestion, TranscriptSegment } from "@/lib/types";

/** A single-glance view of the lesson: who talked when, and where questions landed. */
export function LessonTimeline({
  segments,
  questions,
  durationSec,
}: {
  segments: TranscriptSegment[];
  questions: ClassifiedQuestion[];
  durationSec: number;
}) {
  const t0 = segments[0]?.start ?? 0;
  const total = Math.max(1, durationSec);
  const pct = (t: number) => `${((t - t0) / total) * 100}%`;
  const segById = new Map(segments.map((s) => [s.id, s]));
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div>
      <div className="relative h-16">
        {/* Question markers */}
        <div className="absolute inset-x-0 top-0 h-6">
          {questions.map((q, i) => {
            const s = segById.get(q.segmentId);
            if (!s) return null;
            return (
              <a
                key={i}
                href={`#seg-${q.segmentId}`}
                title={`${formatClock(s.start - t0)} · ${q.type}: ${q.text}`}
                className="absolute top-0 -translate-x-1/2 w-1.5 h-5 rounded-full hover:scale-125 transition-transform"
                style={{ left: pct(s.end), background: QTYPE_COLOR[q.type], boxShadow: `0 0 8px ${QTYPE_COLOR[q.type]}` }}
              />
            );
          })}
        </div>
        {/* Talk track */}
        <div className="absolute inset-x-0 bottom-0 h-8 rounded-lg bg-well border border-line overflow-hidden">
          {segments.map((s) => (
            <span
              key={s.id}
              className="absolute top-1.5 bottom-1.5 rounded-sm"
              style={{
                left: pct(s.start),
                width: `max(2px, ${((s.end - s.start) / total) * 100}%)`,
                background: s.speaker === "student" ? "var(--pink)" : "linear-gradient(180deg, var(--cyan), var(--violet))",
                opacity: s.speaker === "student" ? 0.9 : 0.75,
              }}
            />
          ))}
        </div>
      </div>
      <div className="relative h-4 mt-1.5 font-mono text-[10px] text-dim">
        {ticks.map((t) => (
          <span key={t} className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full" style={{ left: `${t * 100}%` }}>
            {formatClock(total * t)}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted">
        <span className="flex items-center gap-2">
          <span className="w-3 h-2 rounded-sm bg-gradient-to-b from-cyan to-violet" /> Teacher talk
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-2 rounded-sm bg-pink" /> Student talk
        </span>
        <span className="flex items-center gap-2">
          <span className="w-1 h-3 rounded-full bg-lime" /> Question (colour = type)
        </span>
        <span className="text-dim">Gaps = silence / independent work</span>
      </div>
    </div>
  );
}
