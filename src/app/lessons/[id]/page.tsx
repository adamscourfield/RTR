import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Cpu, Quote, Sparkles, Target, TrendingUp } from "lucide-react";
import { getLesson } from "@/lib/store";
import { LEVEL_NAMES, RUBRIC_BY_ID } from "@/lib/rubric";
import { formatClock } from "@/lib/transcript";
import type { QuestionType } from "@/lib/types";
import { AssessmentPanel } from "@/components/AssessmentPanel";
import { ReportActions } from "@/components/ReportActions";
import { TranscriptView } from "@/components/TranscriptView";
import { LessonTimeline } from "@/components/LessonTimeline";
import { QTYPE_COLOR } from "@/lib/qtype";
import { LevelBar, ScoreRing, formatDate, formatDuration, levelColor } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LessonReport({ params }: PageProps<"/lessons/[id]">) {
  const { id } = await params;
  const lesson = await getLesson(id);
  if (!lesson) notFound();
  const a = lesson.analysis;

  return (
    <>
      <div className="rise">
        <Link href="/lessons" className="text-xs text-muted hover:text-text inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Lessons
        </Link>
        <div className="mt-3 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="eyebrow">
              {lesson.subject}
              {lesson.yearGroup && ` · ${lesson.yearGroup}`} · {formatDate(lesson.date)}
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">{lesson.title}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="chip">{lesson.teacher}</span>
              {lesson.source === "demo" && <span className="chip">demo data</span>}
              {a && (
                <span className="chip" title={a.engine === "claude" ? "Analysed by Claude against the RTR rubric" : "Pattern-based analysis (no AI key configured)"}>
                  <Cpu size={11} /> {a.engine === "claude" ? "Claude analysis" : "Pattern engine"}
                </span>
              )}
            </div>
          </div>
          <ReportActions id={lesson.id} />
        </div>
      </div>

      {!a ? (
        <div className="glass p-8 mt-8">This lesson hasn&apos;t been analysed yet. Use “Re-analyse”.</div>
      ) : (
        <>
          <section className="glass p-6 mt-8 flex flex-col md:flex-row gap-8 items-center rise" style={{ animationDelay: "60ms" }}>
            <ScoreRing value={a.overall} size={168} label="delivery" />
            <div className="flex-1 min-w-0 w-full">
              <p className="text-lg leading-relaxed">{a.summary}</p>
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                <Metric label="Duration" value={formatDuration(a.metrics.durationSec)} />
                <Metric label="Questions" value={`${a.metrics.questionCount}`} sub={`${a.metrics.questionsPerTenMin}/10 min`} />
                <Metric label="Open / higher-order" value={`${a.metrics.openQuestionPct}%`} />
                <Metric label="Mean wait time" value={a.metrics.meanWaitTime === null ? "—" : `${a.metrics.meanWaitTime}s`} sub="target ≥ 3s" />
                <Metric label="Speaking pace" value={`${a.metrics.wordsPerMinute} wpm`} />
                <Metric
                  label="Teacher talk"
                  value={a.metrics.teacherTalkPct === null ? "n/a" : `${a.metrics.teacherTalkPct}%`}
                  sub={a.metrics.teacherTalkPct === null ? "no speaker labels" : "of words spoken"}
                />
              </div>
            </div>
          </section>

          <section className="mt-4 glass p-5 rise" style={{ animationDelay: "90ms" }}>
            <div className="eyebrow mb-4">Lesson timeline</div>
            <LessonTimeline segments={lesson.segments} questions={a.questions} durationSec={a.metrics.durationSec} />
          </section>

          <section className="mt-8 rise" style={{ animationDelay: "120ms" }}>
            <h2 className="text-xl font-semibold tracking-tight mb-4">Rubric breakdown</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {a.dimensions.map((d) => {
                const r = RUBRIC_BY_ID[d.id];
                return (
                  <article key={d.id} className="glass p-5 flex flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium">{r.name}</h3>
                        <div className="text-xs mt-0.5" style={{ color: levelColor(d.score) }}>
                          {LEVEL_NAMES[d.score - 1]} · {d.score}/4
                        </div>
                      </div>
                      {r.audioReliability !== "high" && (
                        <span className="chip" title="Audio captures only part of this dimension — treat as indicative">
                          audio: {r.audioReliability}
                        </span>
                      )}
                    </div>
                    <div className="mt-3">
                      <LevelBar score={d.score} />
                    </div>
                    <p className="mt-3 text-sm text-muted leading-relaxed">{d.rationale}</p>
                    {d.evidence.length > 0 && (
                      <ul className="mt-3 flex flex-col gap-2">
                        {d.evidence.slice(0, 3).map((e, i) => (
                          <li key={i}>
                            <a href={`#seg-${e.segmentId}`} className="flex gap-2 text-[13px] leading-snug rounded-lg px-3 py-2 bg-black/25 border border-line hover:border-line-strong">
                              <Quote size={12} className="shrink-0 mt-0.5 text-dim" />
                              <span className="italic text-text/85">{e.quote}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 rise" style={{ animationDelay: "160ms" }}>
            <div className="glass p-5">
              <div className="eyebrow flex items-center gap-2">
                <TrendingUp size={12} className="text-lime" /> What worked
              </div>
              <ul className="mt-3 flex flex-col gap-3 text-sm leading-relaxed">
                {a.strengths.length ? a.strengths.map((s, i) => <li key={i}>{s}</li>) : <li className="text-muted">No dimension reached “Secure” yet.</li>}
              </ul>
            </div>
            <div className="glass p-5 relative overflow-hidden">
              <div className="absolute -bottom-20 -right-10 size-48 rounded-full bg-cyan/15 blur-3xl" />
              <div className="eyebrow flex items-center gap-2">
                <Target size={12} className="text-cyan" /> Try next lesson
              </div>
              <ol className="mt-3 flex flex-col gap-3 text-sm leading-relaxed list-decimal pl-4 marker:text-cyan">
                {a.nextSteps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          </section>

          <section className="mt-8 rise" style={{ animationDelay: "200ms" }}>
            <div className="flex items-end justify-between mb-4">
              <h2 className="text-xl font-semibold tracking-tight">Questions asked</h2>
              <div className="hidden sm:flex flex-wrap gap-2">
                {(Object.keys(QTYPE_COLOR) as QuestionType[]).map((t) => (
                  <span key={t} className="chip">
                    <span className="size-1.5 rounded-full" style={{ background: QTYPE_COLOR[t] }} />
                    {t} · {a.questions.filter((q) => q.type === t).length}
                  </span>
                ))}
              </div>
            </div>
            <div className="glass divide-y divide-line overflow-hidden">
              {a.questions.length === 0 && <div className="p-5 text-sm text-muted">No questions detected.</div>}
              {a.questions.map((q, i) => {
                const seg = lesson.segments.find((s) => s.id === q.segmentId);
                return (
                  <a key={i} href={`#seg-${q.segmentId}`} className="grid grid-cols-[44px_1fr] sm:grid-cols-[52px_1fr_110px_120px] items-center gap-3 px-4 py-3 hover:bg-panel-strong">
                    <span className="font-mono text-[11px] text-dim">{seg ? formatClock(seg.start) : ""}</span>
                    <span className="text-sm min-w-0">{q.text}</span>
                    <span className="hidden sm:inline-flex">
                      <span className="chip" style={{ color: QTYPE_COLOR[q.type], borderColor: "currentColor" }}>
                        {q.type}
                      </span>
                    </span>
                    <span className="hidden sm:flex items-center gap-2">
                      <span className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${Math.min(100, ((q.waitTime ?? 0) / 5) * 100)}%`,
                            background: (q.waitTime ?? 0) >= 3 ? "var(--lime)" : (q.waitTime ?? 0) >= 1.5 ? "var(--amber)" : "var(--red)",
                          }}
                        />
                      </span>
                      <span className="font-mono text-[11px] text-muted w-9 text-right">{q.waitTime === null ? "—" : `${q.waitTime}s`}</span>
                    </span>
                  </a>
                );
              })}
            </div>
          </section>
        </>
      )}

      <section id="outcomes" className="mt-8 scroll-mt-24">
        <h2 className="text-xl font-semibold tracking-tight mb-1 flex items-center gap-2">
          <Sparkles size={18} className="text-pink" /> Triangulate with outcomes
        </h2>
        <p className="text-sm text-muted mb-4">What was said, checked against what students could do.</p>
        <AssessmentPanel lessonId={lesson.id} overall={a?.overall ?? null} assessment={lesson.assessment} />
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold tracking-tight mb-4">Transcript</h2>
        <TranscriptView segments={lesson.segments} questions={a?.questions ?? []} />
      </section>
    </>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <div className="eyebrow !text-[10px]">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-dim">{sub}</div>}
    </div>
  );
}
