import type { DimensionId } from "./types";

export interface RubricDimension {
  id: DimensionId;
  name: string;
  short: string;
  weight: number;
  /** What the research says, in one line. */
  evidence: string;
  sources: string[];
  /** Level descriptors, index 0 = score 1 (emerging) … index 3 = score 4 (exemplary). */
  levels: [string, string, string, string];
  /** Can this be judged from teacher audio alone? */
  audioReliability: "high" | "medium" | "low";
}

export const LEVEL_NAMES = ["Emerging", "Developing", "Secure", "Exemplary"] as const;

export const RUBRIC: RubricDimension[] = [
  {
    id: "questioning",
    name: "Questioning depth",
    short: "Questioning",
    weight: 1.25,
    evidence:
      "Effective teachers ask many questions and a meaningful share probe reasoning (why/how/explain), not just recall.",
    sources: ["Rosenshine (2012) Principle 3", "Coe et al. (2020) Great Teaching Toolkit 4.1", "Bloom's taxonomy"],
    levels: [
      "Few questions; almost all closed recall or rhetorical.",
      "Regular questions but mostly closed; occasional 'why'.",
      "Frequent questions with a clear share of open and reasoning questions.",
      "Questions sequenced from recall to reasoning; students asked to justify, compare, evaluate.",
    ],
    audioReliability: "high",
  },
  {
    id: "checking",
    name: "Checking for understanding",
    short: "Checking",
    weight: 1.25,
    evidence:
      "Checking all students (not just volunteers) lets the teacher adapt before misconceptions embed.",
    sources: ["Rosenshine (2012) Principle 6", "Lemov, Teach Like a Champion: Cold Call, Show Me", "Wiliam (2011) Embedded Formative Assessment"],
    levels: [
      "No systematic checks; relies on 'any questions?' or volunteers.",
      "Occasional checks, mostly hands-up or single students.",
      "Regular whole-class checks (mini-whiteboards, cold call, hinge questions).",
      "Frequent whole-class checks with visible adaptation based on responses.",
    ],
    audioReliability: "high",
  },
  {
    id: "explanation",
    name: "Explanation & modelling",
    short: "Modelling",
    weight: 1,
    evidence:
      "Clear, small-step explanations with worked examples and explicit success criteria reduce cognitive load.",
    sources: ["Rosenshine (2012) Principles 2 & 4", "Sweller, Cognitive Load Theory", "Coe et al. (2020) GTT 3.1"],
    levels: [
      "Explanations unstructured; no worked example or success criteria.",
      "Some structure; worked example or objective present but thin.",
      "Clear objective, sequenced steps and at least one narrated worked example.",
      "Expert thinking made visible; multiple examples/non-examples; steps explicitly signposted.",
    ],
    audioReliability: "high",
  },
  {
    id: "retrieval",
    name: "Retrieval & review",
    short: "Retrieval",
    weight: 0.75,
    evidence: "Daily review and retrieval practice strengthen long-term memory.",
    sources: ["Rosenshine (2012) Principle 1", "Roediger & Karpicke (2006)", "EEF Cognitive Science in the Classroom (2021)"],
    levels: [
      "No reference to prior learning.",
      "Brief mention of prior learning without student retrieval.",
      "Students actively retrieve prior learning (quiz, recall questions).",
      "Spaced retrieval woven through the lesson and linked to new content.",
    ],
    audioReliability: "high",
  },
  {
    id: "feedback",
    name: "Feedback quality",
    short: "Feedback",
    weight: 1,
    evidence: "Specific, task-focused feedback moves learning; generic praise ('good', 'well done') carries little information.",
    sources: ["Hattie & Timperley (2007)", "EEF Teacher Feedback to Improve Pupil Learning (2021)"],
    levels: [
      "Little feedback, or almost entirely generic praise/criticism.",
      "Mix of generic and some task-specific feedback.",
      "Mostly specific feedback naming what was right/wrong and why.",
      "Specific feedback that prompts students to act on it (improve, re-attempt, extend).",
    ],
    audioReliability: "medium",
  },
  {
    id: "waitTime",
    name: "Wait time",
    short: "Wait time",
    weight: 0.75,
    evidence: "Pausing ≥3 seconds after a question increases the length and quality of student answers.",
    sources: ["Rowe (1986)", "Tobin (1987)"],
    levels: [
      "Mean pause after questions under 1s; teacher often answers own questions.",
      "Mean pause 1–2s.",
      "Mean pause 2–3s.",
      "Mean pause ≥3s with explicit 'thinking time' signalled.",
    ],
    audioReliability: "medium",
  },
  {
    id: "practice",
    name: "Guided → independent practice",
    short: "Practice",
    weight: 1,
    evidence: "Guided practice followed by independent practice builds fluency; teacher talk should not crowd out student work.",
    sources: ["Rosenshine (2012) Principles 5, 9 & 10", "Coe et al. (2020) GTT 4.4"],
    levels: [
      "Teacher talks throughout; no clear student practice.",
      "Some practice, but little guidance or scaffolding.",
      "Clear guided practice ('we do') then independent work ('you do').",
      "Scaffolds deliberately faded; practice monitored and adjusted.",
    ],
    audioReliability: "medium",
  },
];

export const RUBRIC_BY_ID = Object.fromEntries(RUBRIC.map((d) => [d.id, d])) as Record<
  DimensionId,
  RubricDimension
>;

/** Weighted mean of 1–4 scores mapped to 0–100. */
export function compositeScore(scores: { id: DimensionId; score: number }[]): number {
  let total = 0;
  let weight = 0;
  for (const s of scores) {
    const w = RUBRIC_BY_ID[s.id]?.weight ?? 1;
    total += ((s.score - 1) / 3) * w;
    weight += w;
  }
  return weight === 0 ? 0 : Math.round((total / weight) * 100);
}
