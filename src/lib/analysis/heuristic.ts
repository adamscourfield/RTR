// Deterministic, transparent rubric engine. Runs with no API key and provides the
// measured metrics (timings, counts) that the Claude engine builds on.
import { compositeScore, RUBRIC, RUBRIC_BY_ID } from "../rubric";
import type {
  ClassifiedQuestion,
  DimensionId,
  DimensionScore,
  LessonAnalysis,
  LessonMetrics,
  TranscriptSegment,
} from "../types";
import {
  CFU,
  classifyQuestion,
  GENERIC_PRAISE,
  isQuestion,
  MODELLING,
  PRACTICE,
  RETRIEVAL,
  SPECIFIC_PRAISE,
  splitSentences,
  THINK_TIME,
  wordCount,
} from "./patterns";

/** Assumed pause when a teacher keeps talking in the same segment straight after a question. */
const SAME_SEGMENT_PAUSE = 0.5;

export function extractQuestions(segments: TranscriptSegment[]): ClassifiedQuestion[] {
  const out: ClassifiedQuestion[] = [];
  segments.forEach((seg, i) => {
    if (seg.speaker === "student") return;
    const sentences = splitSentences(seg.text);
    sentences.forEach((s, j) => {
      if (!isQuestion(s)) return;
      // A question followed only by a think-time cue still ends the teacher's turn.
      const isLast = j === sentences.length - 1 || sentences.slice(j + 1).every((x) => THINK_TIME.test(x));
      const next = segments[i + 1];
      const waitTime = isLast
        ? next
          ? Math.max(0, +(next.start - seg.end).toFixed(1))
          : null
        : SAME_SEGMENT_PAUSE;
      out.push({ segmentId: seg.id, text: s, type: classifyQuestion(s), waitTime });
    });
  });
  return out;
}

export function computeMetrics(segments: TranscriptSegment[], questions: ClassifiedQuestion[]): LessonMetrics {
  const durationSec = segments.length ? Math.max(1, segments[segments.length - 1].end - segments[0].start) : 1;
  const hasStudentLabels = segments.some((s) => s.speaker === "student");
  let teacherWords = 0;
  let studentWords = 0;
  let checks = 0;
  let genericPraise = 0;
  let specificPraise = 0;

  for (const seg of segments) {
    const wc = wordCount(seg.text);
    if (seg.speaker === "student") {
      studentWords += wc;
      continue;
    }
    teacherWords += wc;
    for (const s of splitSentences(seg.text)) {
      if (CFU.test(s)) checks++;
      if (GENERIC_PRAISE.test(s)) genericPraise++;
      if (SPECIFIC_PRAISE.test(s)) specificPraise++;
    }
  }

  const teacherSec = segments.filter((s) => s.speaker !== "student").reduce((a, s) => a + (s.end - s.start), 0);
  const substantive = questions.filter((q) => q.type !== "procedural");
  const open = substantive.filter((q) => q.type === "open" || q.type === "higher-order");
  const waits = substantive.map((q) => q.waitTime).filter((w): w is number => w !== null);

  return {
    durationSec: Math.round(durationSec),
    teacherWords,
    studentWords,
    wordsPerMinute: teacherSec > 0 ? Math.round(teacherWords / (teacherSec / 60)) : 0,
    teacherTalkPct: hasStudentLabels ? Math.round((teacherWords / Math.max(1, teacherWords + studentWords)) * 100) : null,
    questionCount: questions.length,
    questionsPerTenMin: +((questions.length / durationSec) * 600).toFixed(1),
    openQuestionPct: substantive.length ? Math.round((open.length / substantive.length) * 100) : 0,
    meanWaitTime: waits.length ? +(waits.reduce((a, b) => a + b, 0) / waits.length).toFixed(1) : null,
    checksForUnderstanding: checks,
    genericPraise,
    specificPraise,
  };
}

function band(value: number, cuts: [number, number, number]): number {
  if (value < cuts[0]) return 1;
  if (value < cuts[1]) return 2;
  if (value < cuts[2]) return 3;
  return 4;
}

function matches(segments: TranscriptSegment[], re: RegExp, limit = 3) {
  const hits: { segmentId: string; quote: string }[] = [];
  let count = 0;
  for (const seg of segments) {
    if (seg.speaker === "student") continue;
    for (const s of splitSentences(seg.text)) {
      if (re.test(s)) {
        count++;
        if (hits.length < limit) hits.push({ segmentId: seg.id, quote: s });
      }
    }
  }
  return { count, hits };
}

const NEXT_STEP: Record<DimensionId, string> = {
  questioning:
    "Plan three 'why/how do you know' questions in advance and follow each correct answer with 'How do you know?' or 'Can you prove it?'.",
  checking:
    "Replace 'Any questions?' with a whole-class check: mini-whiteboards or a hinge question every 10–15 minutes, then adapt based on what you see.",
  explanation:
    "State the success criteria up front and narrate one worked example out loud ('Watch me… I'm thinking…') before students attempt their own.",
  retrieval: "Open with a 3–5 question retrieval quiz covering last lesson, last week and last term.",
  feedback:
    "Swap 'Good!' for feedback that names the move: 'That's right because you…' or 'Even better if you…'.",
  waitTime:
    "After asking a question, count silently to three before taking an answer — and signal it: 'Thinking time, no hands yet.'",
  practice:
    "Build in an explicit 'we do' step before independent work, and cap uninterrupted teacher talk at ~10 minutes.",
};

export function heuristicAnalysis(segments: TranscriptSegment[]): LessonAnalysis {
  const questions = extractQuestions(segments);
  const m = computeMetrics(segments, questions);
  const per10 = (n: number) => (n / Math.max(60, m.durationSec)) * 600;
  const per30 = (n: number) => (n / Math.max(60, m.durationSec)) * 1800;

  const higher = questions.filter((q) => q.type === "higher-order" || q.type === "open");
  const qEvidence = higher.slice(0, 3).map((q) => ({ segmentId: q.segmentId, quote: q.text }));

  let qScore = band(m.openQuestionPct, [15, 30, 50]);
  if (m.questionsPerTenMin < 2) qScore = Math.min(qScore, 2);

  const cfu = matches(segments, CFU);
  const model = matches(segments, MODELLING);
  const retr = matches(segments, RETRIEVAL);
  const prac = matches(segments, PRACTICE);
  const think = matches(segments, THINK_TIME, 1);
  const spec = matches(segments, SPECIFIC_PRAISE);

  const fbTotal = m.genericPraise + m.specificPraise;
  const fbRatio = fbTotal ? m.specificPraise / fbTotal : 0;
  const fbScore = fbTotal < 2 ? 1 : band(fbRatio, [0.2, 0.45, 0.65]);

  let wtScore = m.meanWaitTime === null ? 2 : band(m.meanWaitTime, [1, 2, 3]);
  if (think.count > 0 && wtScore >= 2) wtScore = Math.min(4, wtScore + 1);

  let pScore = band(per30(prac.count), [1, 3, 6]);
  if (m.teacherTalkPct !== null && m.teacherTalkPct > 92) pScore = Math.min(pScore, 2);

  const dims: DimensionScore[] = [
    {
      id: "questioning",
      score: qScore,
      rationale: `${m.questionCount} questions (${m.questionsPerTenMin}/10 min); ${m.openQuestionPct}% of substantive questions were open or higher-order.`,
      evidence: qEvidence,
    },
    {
      id: "checking",
      score: band(per10(cfu.count), [0.3, 1, 2]),
      rationale: `${cfu.count} whole-class checks detected (${per10(cfu.count).toFixed(1)}/10 min).`,
      evidence: cfu.hits,
    },
    {
      id: "explanation",
      score: band(per30(model.count), [1, 3, 6]),
      rationale: `${model.count} modelling / signposting moves (objectives, worked examples, step language).`,
      evidence: model.hits,
    },
    {
      id: "retrieval",
      score: band(retr.count, [1, 2, 4]),
      rationale: `${retr.count} references to prior learning or retrieval activities.`,
      evidence: retr.hits,
    },
    {
      id: "feedback",
      score: fbScore,
      rationale: `${m.specificPraise} specific vs ${m.genericPraise} generic feedback statements.`,
      evidence: spec.hits,
    },
    {
      id: "waitTime",
      score: wtScore,
      rationale:
        m.meanWaitTime === null
          ? "Not enough timing data to measure pauses after questions."
          : `Mean pause after questions: ${m.meanWaitTime}s${think.count ? "; explicit thinking time signalled" : ""}.`,
      evidence: think.hits,
    },
    {
      id: "practice",
      score: pScore,
      rationale: `${prac.count} guided/independent practice cues${m.teacherTalkPct !== null ? `; teacher spoke ${m.teacherTalkPct}% of words` : ""}.`,
      evidence: prac.hits,
    },
  ];

  const ranked = [...dims].sort((a, b) => b.score - a.score || RUBRIC_BY_ID[b.id].weight - RUBRIC_BY_ID[a.id].weight);
  const strengths = ranked
    .filter((d) => d.score >= 3)
    .slice(0, 3)
    .map((d) => `${RUBRIC_BY_ID[d.id].name}: ${d.rationale}`);
  const nextSteps = [...ranked]
    .reverse()
    .filter((d) => d.score <= 2)
    .slice(0, 3)
    .map((d) => NEXT_STEP[d.id]);

  const overall = compositeScore(dims);
  const weakest = RUBRIC_BY_ID[ranked[ranked.length - 1].id].name.toLowerCase();

  return {
    engine: "heuristic",
    analysedAt: new Date().toISOString(),
    overall,
    dimensions: RUBRIC.map((r) => dims.find((d) => d.id === r.id)!),
    questions,
    metrics: m,
    strengths,
    nextSteps,
    summary: `Pattern-based analysis of ${Math.round(m.durationSec / 60)} minutes of talk. Composite ${overall}/100; biggest opportunity is ${weakest}.`,
  };
}
