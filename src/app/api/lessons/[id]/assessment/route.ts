import { z } from "zod";
import { getLesson, updateLesson } from "@/lib/store";
import { buildAssessment, DEFAULT_MASTERY, parseResults } from "@/lib/triangulate";

const Body = z.object({
  kind: z.enum(["exit-ticket", "worksheet", "assessment"]),
  csv: z.string().min(1).max(500_000),
  defaultMax: z.number().positive().default(10),
  masteryThreshold: z.number().min(1).max(100).default(DEFAULT_MASTERY),
});

export async function POST(req: Request, ctx: RouteContext<"/api/lessons/[id]/assessment">) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, { status: 400 });
  if (!(await getLesson(id))) return Response.json({ error: "Not found" }, { status: 404 });

  const results = parseResults(parsed.data.csv, parsed.data.defaultMax);
  if (!results.length) return Response.json({ error: "No rows found. Use: student, score[, max]" }, { status: 400 });
  const assessment = buildAssessment(parsed.data.kind, results, parsed.data.masteryThreshold);
  await updateLesson(id, { assessment });
  return Response.json(assessment);
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/lessons/[id]/assessment">) {
  const { id } = await ctx.params;
  const updated = await updateLesson(id, { assessment: null });
  return updated ? new Response(null, { status: 204 }) : Response.json({ error: "Not found" }, { status: 404 });
}
