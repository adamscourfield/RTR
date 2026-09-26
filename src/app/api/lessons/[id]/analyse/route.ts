import { analyseLesson } from "@/lib/analysis";
import { getLesson, updateLesson } from "@/lib/store";

export async function POST(_req: Request, ctx: RouteContext<"/api/lessons/[id]/analyse">) {
  const { id } = await ctx.params;
  const lesson = await getLesson(id);
  if (!lesson) return Response.json({ error: "Not found" }, { status: 404 });
  const analysis = await analyseLesson(lesson);
  await updateLesson(id, { analysis });
  return Response.json(analysis);
}
