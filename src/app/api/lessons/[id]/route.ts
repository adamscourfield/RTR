import { deleteLesson, getLesson } from "@/lib/store";

export async function GET(_req: Request, ctx: RouteContext<"/api/lessons/[id]">) {
  const { id } = await ctx.params;
  const lesson = await getLesson(id);
  return lesson ? Response.json(lesson) : Response.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/lessons/[id]">) {
  const { id } = await ctx.params;
  return (await deleteLesson(id)) ? new Response(null, { status: 204 }) : Response.json({ error: "Not found" }, { status: 404 });
}
