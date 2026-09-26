import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { compositeScore, LEVEL_NAMES, RUBRIC } from "../rubric";
import type { LessonAnalysis, TranscriptSegment } from "../types";
import { computeMetrics, extractQuestions } from "./heuristic";

const MODEL = process.env.RTR_MODEL ?? "claude-opus-5";

const DimensionIds = z.enum(["questioning", "checking", "explanation", "retrieval", "feedback", "waitTime", "practice"]);

const AnalysisSchema = z.object({
  dimensions: z.array(
    z.object({
      id: DimensionIds,
      score: z.number().int().min(1).max(4),
      rationale: z.string(),
      evidence: z.array(z.object({ segmentId: z.string(), quote: z.string() })),
    }),
  ),
  questions: z.array(
    z.object({
      segmentId: z.string(),
      text: z.string(),
      type: z.enum(["closed", "open", "higher-order", "procedural", "rhetorical"]),
    }),
  ),
  strengths: z.array(z.string()),
  nextSteps: z.array(z.string()),
  summary: z.string(),
});

const SYSTEM = `You are RTR, an instructional coach that analyses classroom lesson transcripts against an evidence-based rubric.

Principles:
- Judge only what the transcript shows. Audio misses body language, board work, circulation and silent student work; when evidence is thin, say so in the rationale and score conservatively rather than guessing.
- Every score must be backed by verbatim quotes, referenced by segment id. Prefer 1–3 quotes per dimension.
- Be specific and actionable. Next steps should be concrete moves the teacher can try next lesson, phrased as something to say or do.
- Be honest and direct, not flattering. Teachers want accurate feedback.
- The transcript comes from speech-to-text and may contain recognition errors; don't penalise obvious transcription noise.

Rubric (score each 1–4: ${LEVEL_NAMES.join(", ")}):
${RUBRIC.map(
  (d) =>
    `## ${d.id} — ${d.name}\nWhy it matters: ${d.evidence}\n${d.levels.map((l, i) => `  ${i + 1}. ${l}`).join("\n")}`,
).join("\n\n")}

Also list every question the teacher asked, classified as closed, open, higher-order, procedural (classroom management) or rhetorical.
Return 2–3 strengths and 2–3 next steps, and a 2–3 sentence summary.`;

export function claudeAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export async function claudeAnalysis(segments: TranscriptSegment[], context: string): Promise<LessonAnalysis> {
  const client = new Anthropic();

  // Measured metrics (timings, counts) are computed deterministically and handed to the model
  // so its judgement is anchored to facts it can't infer from text alone (e.g. pauses).
  const measuredQuestions = extractQuestions(segments);
  const metrics = computeMetrics(segments, measuredQuestions);

  const transcript = segments
    .map((s) => `[${s.id} ${fmt(s.start)}–${fmt(s.end)} ${s.speaker}] ${s.text}`)
    .join("\n");

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Lesson context: ${context}

Measured metrics (from timestamps — trust these over your own estimates):
${JSON.stringify(metrics, null, 2)}

Transcript:
${transcript}`,
      },
    ],
    output_config: { format: betaZodOutputFormat(AnalysisSchema) },
  });

  if (response.stop_reason === "refusal") throw new Error("Analysis declined by the model");
  const parsed = response.parsed_output;
  if (!parsed) throw new Error(`Unparseable analysis (stop_reason: ${response.stop_reason})`);

  const waitBySegment = new Map(measuredQuestions.map((q) => [q.segmentId + q.text, q.waitTime]));
  const lastWaitBySegment = new Map(measuredQuestions.map((q) => [q.segmentId, q.waitTime]));

  // Keep rubric order and guarantee every dimension exists.
  const dimensions = RUBRIC.map(
    (r) =>
      parsed.dimensions.find((d) => d.id === r.id) ?? {
        id: r.id,
        score: 1,
        rationale: "No evidence found in the transcript.",
        evidence: [],
      },
  );

  return {
    engine: "claude",
    analysedAt: new Date().toISOString(),
    overall: compositeScore(dimensions),
    dimensions,
    questions: parsed.questions.map((q) => ({
      ...q,
      waitTime: waitBySegment.get(q.segmentId + q.text) ?? lastWaitBySegment.get(q.segmentId) ?? null,
    })),
    metrics,
    strengths: parsed.strengths,
    nextSteps: parsed.nextSteps,
    summary: parsed.summary,
  };
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
