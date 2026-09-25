import { randomUUID } from "crypto";
import { z } from "zod";
import { analyseLesson } from "@/lib/analysis";
import { listLessons, saveLesson } from "@/lib/store";
import { parseTranscript } from "@/lib/transcript";
import type { Lesson } from "@/lib/types";

const Segment = z.object({
  id: z.string(),
  start: z.number(),
  end: z.number(),
  speaker: z.enum(["teacher", "student", "unknown"]),
  text: z.string(),
});

const Body = z
  .object({
    title: z.string().trim().min(1).max(200),
    subject: z.string().trim().max(80).default("General"),
    yearGroup: z.string().trim().max(40).default(""),
    teacher: z.string().trim().max(120).default("Me"),
    source: z.enum(["live", "import"]),
    segments: z.array(Segment).optional(),
    rawTranscript: z.string().max(2_000_000).optional(),
  })
  .refine((b) => b.segments?.length || b.rawTranscript?.trim(), "Provide segments or rawTranscript");

export async function GET() {
  return Response.json(await listLessons());
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, { status: 400 });
  const b = parsed.data;
  const segments = b.segments?.length ? b.segments : parseTranscript(b.rawTranscript!);
  const usable = segments.filter((s) => s.text.trim());
  if (!usable.length) return Response.json({ error: "Transcript is empty" }, { status: 400 });

  const lesson: Lesson = {
    id: randomUUID(),
    title: b.title,
    subject: b.subject,
    yearGroup: b.yearGroup,
    teacher: b.teacher,
    date: new Date().toISOString(),
    source: b.source,
    segments: usable,
    analysis: null,
    assessment: null,
  };
  lesson.analysis = await analyseLesson(lesson);
  await saveLesson(lesson);
  return Response.json({ id: lesson.id }, { status: 201 });
}
