import { RUBRIC } from "./rubric";
import type { Assessment, DimensionId, LessonSummary, StudentResult } from "./types";

export const DEFAULT_MASTERY = 70;

/**
 * Parse assessment results. Accepts CSV/TSV with rows of `student, score[, max]`.
 * A header row is skipped automatically. `defaultMax` is used when no max column exists.
 */
export function parseResults(raw: string, defaultMax: number): StudentResult[] {
  const rows = raw
    .split(/\r?\n/)
    .map((l) => l.split(/[,\t;]/).map((c) => c.trim()))
    .filter((c) => c.length >= 2 && c[0] !== "");
  const results: StudentResult[] = [];
  for (const [student, score, max] of rows) {
    const s = parseFloat(score);
    if (Number.isNaN(s)) continue; // header or junk
    const m = max !== undefined && max !== "" ? parseFloat(max) : defaultMax;
    if (!m || Number.isNaN(m)) continue;
    results.push({ student, score: s, max: m });
  }
  return results;
}

export function buildAssessment(
  kind: Assessment["kind"],
  results: StudentResult[],
  masteryThreshold = DEFAULT_MASTERY,
): Assessment {
  const pcts = results.map((r) => (r.score / r.max) * 100);
  return {
    kind,
    uploadedAt: new Date().toISOString(),
    results,
    meanPct: pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0,
    masteryPct: pcts.length ? Math.round((pcts.filter((p) => p >= masteryThreshold).length / pcts.length) * 100) : 0,
    masteryThreshold,
  };
}

export type Verdict = "aligned-strong" | "aligned-weak" | "delivery-not-landing" | "outcomes-beat-delivery";

/** Compare how the lesson *sounded* with what students *could do*. */
export function triangulate(overall: number, masteryPct: number): { verdict: Verdict; headline: string; detail: string } {
  const goodDelivery = overall >= 55;
  const goodOutcome = masteryPct >= 60;
  if (goodDelivery && goodOutcome)
    return {
      verdict: "aligned-strong",
      headline: "Delivery and outcomes agree",
      detail: "The teaching moves RTR heard are showing up in what students can do. Keep these moves.",
    };
  if (!goodDelivery && !goodOutcome)
    return {
      verdict: "aligned-weak",
      headline: "Both signals point the same way",
      detail: "Delivery scored low and so did outcomes. Start with the top next step — it's the most likely lever.",
    };
  if (goodDelivery)
    return {
      verdict: "delivery-not-landing",
      headline: "It sounded good — it didn't land",
      detail:
        "The lesson ticked the rubric boxes but most students didn't reach mastery. Look at checks for understanding: were misconceptions surfaced and acted on? Was the exit ticket aligned to what was taught?",
    };
  return {
    verdict: "outcomes-beat-delivery",
    headline: "Students did better than the audio suggests",
    detail:
      "Outcomes were strong despite a modest delivery score. The effective part may be something audio can't hear (resources, prior teaching, silent practice) — or the assessment was too easy.",
  };
}

export function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  if (dx === 0 || dy === 0) return null;
  return +(num / Math.sqrt(dx * dy)).toFixed(2);
}

export interface Driver {
  key: string;
  label: string;
  r: number | null;
  n: number;
}

/** Which measured behaviours move with student outcomes across all lessons that have both. */
export function outcomeDrivers(lessons: LessonSummary[]): Driver[] {
  const paired = lessons.filter((l) => l.analysis && l.assessment);
  const y = paired.map((l) => l.assessment!.masteryPct);
  const dims: Driver[] = RUBRIC.map((d) => ({
    key: d.id,
    label: d.name,
    r: pearson(
      paired.map((l) => l.analysis!.dimensions.find((x) => x.id === (d.id as DimensionId))?.score ?? 0),
      y,
    ),
    n: paired.length,
  }));
  const metric = (key: string, label: string, f: (l: LessonSummary) => number | null): Driver => {
    const rows = paired.map((l) => [f(l), l.assessment!.masteryPct] as const).filter(([x]) => x !== null) as [number, number][];
    return { key, label, r: pearson(rows.map((r) => r[0]), rows.map((r) => r[1])), n: rows.length };
  };
  return [
    ...dims,
    metric("openQuestionPct", "% open questions", (l) => l.analysis!.metrics.openQuestionPct),
    metric("meanWaitTime", "Mean wait time", (l) => l.analysis!.metrics.meanWaitTime),
    metric("wpm", "Speaking pace (wpm)", (l) => l.analysis!.metrics.wordsPerMinute),
    metric("teacherTalk", "Teacher talk %", (l) => l.analysis!.metrics.teacherTalkPct),
  ].sort((a, b) => Math.abs(b.r ?? 0) - Math.abs(a.r ?? 0));
}
