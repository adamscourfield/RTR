import Link from "next/link";
import { ArrowRight, Mic, Sparkles, Upload } from "lucide-react";
import { listLessons } from "@/lib/store";
import { RUBRIC } from "@/lib/rubric";
import { LessonRow } from "@/components/LessonRow";
import { LevelBar, PageHeader, ScoreRing, Stat, TrendChart, formatDuration } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const lessons = await listLessons();
  const analysed = lessons.filter((l) => l.analysis);
  const recent = analysed.slice(0, 5);
  const chrono = [...analysed].reverse();

  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
  const last5 = analysed.slice(0, 5);
  const prev5 = analysed.slice(5, 10);
  const current = avg(last5.map((l) => l.analysis!.overall));
  const delta = prev5.length ? current - avg(prev5.map((l) => l.analysis!.overall)) : 0;
  const withOutcomes = analysed.filter((l) => l.assessment);
  const awaiting = analysed.filter((l) => !l.assessment);

  const dimAvg = RUBRIC.map((d) => {
    const scores = last5.map((l) => l.analysis!.dimensions.find((x) => x.id === d.id)?.score ?? 0);
    return { d, score: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0 };
  });

  return (
    <>
      <PageHeader eyebrow="Overview" title={<>Your teaching, <span className="glow-text">read back to you.</span></>}>
        <Link href="/lessons/new" className="btn btn-ghost">
          <Upload size={16} /> Import transcript
        </Link>
        <Link href="/live" className="btn btn-primary">
          <Mic size={16} /> Start live lesson
        </Link>
      </PageHeader>

      <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-4 rise" style={{ animationDelay: "60ms" }}>
        <div className="glass p-6 flex flex-col sm:flex-row items-center gap-6">
          <ScoreRing value={current} size={150} label="last 5" />
          <div className="flex-1 w-full">
            <div className="eyebrow">Delivery score</div>
            <div className="mt-1 text-sm text-muted">
              {prev5.length ? (
                <>
                  <span style={{ color: delta >= 0 ? "var(--lime)" : "var(--red)" }}>
                    {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)} pts
                  </span>{" "}
                  vs the previous five lessons
                </>
              ) : (
                "Record more lessons to see your trend."
              )}
            </div>
            <div className="mt-5 grid gap-2.5">
              {dimAvg.map(({ d, score }) => (
                <div key={d.id} className="grid grid-cols-[92px_1fr_28px] items-center gap-3 text-xs">
                  <span className="text-muted truncate">{d.short}</span>
                  <LevelBar score={Math.round(score)} />
                  <span className="tabular-nums text-right text-muted">{score.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass p-6">
          <div className="flex items-center justify-between">
            <div className="eyebrow">Trajectory</div>
            <span className="chip">{chrono.length} lessons</span>
          </div>
          <div className="mt-4">
            <TrendChart
              series={[
                { label: "Delivery score", color: "var(--cyan)", values: chrono.map((l) => l.analysis!.overall) },
                { label: "Student mastery %", color: "var(--pink)", values: chrono.map((l) => l.assessment?.masteryPct ?? null) },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 rise" style={{ animationDelay: "120ms" }}>
        <Stat label="Lessons analysed" value={analysed.length} hint={`${formatDuration(analysed.reduce((a, l) => a + l.analysis!.metrics.durationSec, 0))} of talk`} />
        <Stat
          label="Open questions"
          value={`${avg(last5.map((l) => l.analysis!.metrics.openQuestionPct))}%`}
          hint="of substantive questions"
          accent="var(--cyan)"
        />
        <Stat
          label="Mean wait time"
          value={`${(last5.reduce((a, l) => a + (l.analysis!.metrics.meanWaitTime ?? 0), 0) / Math.max(1, last5.length)).toFixed(1)}s`}
          hint="research target ≥ 3s"
          accent="var(--violet)"
        />
        <Stat
          label="Student mastery"
          value={withOutcomes.length ? `${avg(withOutcomes.slice(0, 5).map((l) => l.assessment!.masteryPct))}%` : "—"}
          hint={`${awaiting.length} awaiting exit ticket`}
          accent="var(--pink)"
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 mt-4 rise" style={{ animationDelay: "180ms" }}>
        <div className="glass p-2 sm:p-3">
          <div className="flex items-center justify-between px-3 pt-3 pb-2">
            <div className="eyebrow">Recent lessons</div>
            <Link href="/lessons" className="text-xs text-muted hover:text-text flex items-center gap-1">
              All lessons <ArrowRight size={12} />
            </Link>
          </div>
          {recent.map((l) => (
            <LessonRow key={l.id} lesson={l} />
          ))}
        </div>

        <div className="flex flex-col gap-4">
          {last5[0]?.analysis?.nextSteps[0] && (
            <div className="glass p-5 relative overflow-hidden">
              <div className="absolute -top-16 -right-16 size-40 rounded-full bg-violet/20 blur-3xl" />
              <div className="eyebrow flex items-center gap-2">
                <Sparkles size={12} className="text-violet" /> Focus for next lesson
              </div>
              <p className="mt-3 text-sm leading-relaxed">{last5[0].analysis.nextSteps[0]}</p>
              <Link href={`/lessons/${last5[0].id}`} className="mt-4 inline-flex text-xs text-cyan items-center gap-1">
                From “{last5[0].title}” <ArrowRight size={12} />
              </Link>
            </div>
          )}
          {awaiting.length > 0 && (
            <div className="glass p-5">
              <div className="eyebrow">Close the loop</div>
              <p className="mt-3 text-sm text-muted">
                Upload exit-ticket results to see whether what you said translated into what students can do.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {awaiting.slice(0, 3).map((l) => (
                  <Link key={l.id} href={`/lessons/${l.id}#outcomes`} className="flex items-center justify-between text-sm rounded-xl px-3 py-2 bg-panel border border-line hover:border-line-strong">
                    <span className="truncate">{l.title}</span>
                    <Upload size={14} className="text-pink shrink-0 ml-2" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
