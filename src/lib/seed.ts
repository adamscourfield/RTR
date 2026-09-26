// Synthetic demo lessons so a fresh install has something to explore.
// Clearly labelled as demo data in the UI; deterministic via a seeded RNG.
import { heuristicAnalysis } from "./analysis/heuristic";
import { buildAssessment } from "./triangulate";
import type { Lesson, Speaker, TranscriptSegment } from "./types";

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

type Line = [Speaker, string, number?]; // speaker, text, pause-after seconds

const STRONG_OPEN: Line[] = [
  ["teacher", "Morning everyone. Do now is on the board — five questions, three minutes, no talking. Go.", 180],
  ["teacher", "Right, pens down. Question one: what did we learn last lesson about equivalent fractions? Hands down, I'm going to pick.", 3.4],
  ["teacher", "Amara?", 1],
  ["student", "You multiply the top and bottom by the same number."],
  ["teacher", "That's right because the ratio stays the same. How do you know the value doesn't change?", 3.8],
  ["student", "Because it's like multiplying by one."],
  ["teacher", "Exactly — multiplying by one. Today we are learning to add fractions with different denominators. By the end of the lesson you'll be able to explain why we need a common denominator.", 1],
];
const STRONG_MODEL: Line[] = [
  ["teacher", "Watch me first. I'm thinking: two thirds plus one quarter. I can't add these yet — the pieces are different sizes.", 0.6],
  ["teacher", "Step one, I find a common denominator. Twelve works for both. Notice how I check: three goes into twelve, four goes into twelve.", 0.6],
  ["teacher", "Step two, I convert. Two thirds becomes eight twelfths, one quarter becomes three twelfths. Step three, eight plus three is eleven twelfths.", 1],
  ["teacher", "Why would it be wrong to just add the tops and the bottoms? Thinking time, no hands yet.", 4.2],
  ["teacher", "Turn and talk to your partner — thirty seconds.", 30],
  ["teacher", "Jamal, what did your partner say?", 2.8],
  ["student", "Three sevenths is smaller than two thirds so it can't be the answer."],
  ["teacher", "I like how you used an estimate to check. That's a brilliant reasoning move.", 1],
];
const STRONG_CHECK: Line[] = [
  ["teacher", "Mini whiteboards. One half plus one third. Show me on three. One, two, three — boards up.", 5],
  ["teacher", "I can see most of you have five sixths. A few have two fifths — let's look at why that's tempting.", 1],
  ["teacher", "What would happen if we used twelve instead of six as the denominator? Would the answer change?", 3.6],
  ["student", "It'd be ten twelfths, which is the same."],
  ["teacher", "That's correct because ten twelfths simplifies to five sixths. Even better if you'd simplified it straight away.", 1],
];
const STRONG_PRACTICE: Line[] = [
  ["teacher", "We do the next one together. Three fifths plus one half. What's our first step?", 3.1],
  ["student", "Find a common denominator — ten."],
  ["teacher", "And how do you know ten works?", 3],
  ["student", "Both five and two go into it."],
  ["teacher", "Now your turn. Complete questions one to six on your own. I'll be coming round.", 780],
  ["teacher", "Pause. Hinge question on the board. Fingers up — A, B, C or D. Show me.", 4.5],
  ["teacher", "Most of you said C. Explain why B is wrong, Priya.", 3.2],
  ["student", "B added the denominators."],
  ["teacher", "Exactly. Exit ticket now — three questions, on your own.", 2],
];

const WEAK_OPEN: Line[] = [
  ["teacher", "Okay, settle down. Books out. Today we're doing adding fractions, okay?", 0.4],
  ["teacher", "So fractions, you've all done fractions before, right? Right. So what you do is you get the bottom numbers the same.", 0.3],
  ["teacher", "Everyone ok? Good.", 0.4],
];
const WEAK_EXPLAIN: Line[] = [
  ["teacher", "So if I have two thirds and one quarter, what's the bottom number? Twelve. So it's eight twelfths and three twelfths, which is eleven twelfths.", 0.3],
  ["teacher", "It's quite easy really, isn't it? You just find the number they both go into and then times the top.", 0.2],
  ["teacher", "What's three times four?", 0.8],
  ["student", "Twelve."],
  ["teacher", "Good.", 0.3],
  ["teacher", "And what's two times four? Eight. Good. So that's how you do it.", 0.4],
  ["teacher", "Any questions? No? Great.", 0.6],
  ["teacher", "And some people get confused and add the bottoms but you don't do that because that's wrong. Okay?", 0.4],
];
const WEAK_PRACTICE: Line[] = [
  ["teacher", "Right, do the worksheet. Questions one to twenty.", 900],
  ["teacher", "Shh. Stop talking at the back. Just get on with it.", 420],
  ["teacher", "What's a half plus a third? Anyone? Six? It's five sixths.", 0.5],
  ["teacher", "Well done.", 0.4],
  ["teacher", "Does that make sense? Great. Finish it for homework.", 1],
];

const TOPICS: [string, string][] = [
  ["Maths", "Adding fractions with unlike denominators"],
  ["Maths", "Solving two-step equations"],
  ["Science", "Particle model of states of matter"],
  ["English", "Analysing language in Macbeth Act 1"],
  ["History", "Causes of the First World War"],
  ["Maths", "Area of compound shapes"],
  ["Science", "Photosynthesis and limiting factors"],
  ["English", "Crafting persuasive openings"],
  ["Geography", "Plate boundaries and hazards"],
  ["Maths", "Ratio and proportion problems"],
  ["Science", "Balancing chemical equations"],
  ["History", "The Industrial Revolution and public health"],
];
const TEACHERS = ["A. Scourfield", "R. Okafor", "L. Chen", "M. Patel"];
const YEARS = ["Year 7", "Year 8", "Year 9", "Year 10"];
const NAMES = ["Amara", "Jamal", "Priya", "Tom", "Sofia", "Leo", "Maya", "Ethan", "Zara", "Noah", "Ivy", "Kai", "Ruby", "Omar", "Ella", "Finn", "Aisha", "Sam", "Grace", "Theo", "Hana", "Max", "Lily", "Ravi", "Chloe", "Ben"];

function buildSegments(lines: Line[]): TranscriptSegment[] {
  const segs: TranscriptSegment[] = [];
  let t = 0;
  lines.forEach(([speaker, text, pause], i) => {
    const words = text.split(/\s+/).length;
    const dur = Math.max(1, (words / (speaker === "teacher" ? 155 : 120)) * 60);
    segs.push({ id: `s${i + 1}`, start: +t.toFixed(1), end: +(t + dur).toFixed(1), speaker, text });
    t += dur + (pause ?? 1.2);
  });
  return segs;
}

/** Mix strong and weak blocks according to quality q ∈ [0,1]. */
function composeLesson(q: number, r: () => number): Line[] {
  const pick = (strong: Line[], weak: Line[]) => (r() < q ? strong : weak);
  return [
    ...pick(STRONG_OPEN, WEAK_OPEN),
    ...pick(STRONG_MODEL, WEAK_EXPLAIN),
    ...(r() < q ? STRONG_CHECK : []),
    ...pick(STRONG_PRACTICE, WEAK_PRACTICE),
  ];
}

export function seedLessons(): Lesson[] {
  const r = rng(42);
  const now = Date.UTC(2026, 8, 25);
  const lessons: Lesson[] = [];
  const count = TOPICS.length;
  for (let i = 0; i < count; i++) {
    // Quality drifts upward over time, as it would with coaching.
    const q = Math.min(0.95, Math.max(0.05, 0.25 + (i / count) * 0.55 + (r() - 0.5) * 0.4));
    const segments = buildSegments(composeLesson(q, r));
    const analysis = heuristicAnalysis(segments);
    const [subject, title] = TOPICS[i];
    const date = new Date(now - (count - i) * 3.5 * 86400000).toISOString();
    analysis.analysedAt = date;

    const hasAssessment = i !== count - 1; // most recent lesson still awaiting its exit ticket
    const n = 24 + Math.floor(r() * 6);
    // Outcomes loosely track delivery, with noise — the relationship is real but imperfect.
    const base = 0.35 + (analysis.overall / 100) * 0.45 + (r() - 0.5) * 0.35;
    const results = NAMES.slice(0, n).map((student) => ({
      student,
      score: Math.max(0, Math.min(5, Math.round((base + (r() - 0.5) * 0.6) * 5))),
      max: 5,
    }));
    lessons.push({
      id: `demo-${i + 1}`,
      title,
      subject,
      yearGroup: YEARS[i % YEARS.length],
      teacher: TEACHERS[i % TEACHERS.length],
      date,
      source: "demo",
      segments,
      analysis,
      assessment: hasAssessment ? { ...buildAssessment("exit-ticket", results), uploadedAt: date } : null,
    });
  }
  return lessons.reverse();
}

/** A scripted lesson for the live page's demo mode (no microphone needed). */
export function demoScript(): TranscriptSegment[] {
  return buildSegments([...WEAK_OPEN, ...STRONG_MODEL, ...WEAK_EXPLAIN.slice(2, 7), ...STRONG_CHECK, ...STRONG_PRACTICE]).map((s) => ({
    ...s,
    speaker: "unknown" as const,
  }));
}
