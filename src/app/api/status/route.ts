import { claudeAvailable } from "@/lib/analysis/claude";
import { assemblyAiAvailable } from "@/lib/transcription/assemblyai";

export async function GET() {
  return Response.json({ engine: claudeAvailable() ? "claude" : "heuristic", transcription: assemblyAiAvailable() });
}
