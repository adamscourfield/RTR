import { claudeAvailable } from "@/lib/analysis/claude";

export async function GET() {
  return Response.json({ engine: claudeAvailable() ? "claude" : "heuristic" });
}
