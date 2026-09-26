import { assemblyAiAvailable, transcribeAudio } from "@/lib/transcription/assemblyai";

export const maxDuration = 900; // a full lesson recording can take several minutes to transcribe

// Accepts a recorded lesson (multipart form, field "audio") and returns diarized segments.
// This is the piece that lets audio — from the in-browser recorder or an external device —
// become an accurate, teacher/student-labelled transcript, instead of relying on the
// browser's own (non-diarizing, off-device) speech recognition for the saved lesson.
export async function POST(req: Request) {
  if (!assemblyAiAvailable()) {
    return Response.json({ error: "Transcription isn't configured. Set ASSEMBLYAI_API_KEY to enable audio upload." }, { status: 503 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("audio");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "No audio file provided" }, { status: 400 });
  }
  if (file.size > 300 * 1024 * 1024) {
    return Response.json({ error: "Audio file is too large (max 300MB)" }, { status: 413 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const segments = await transcribeAudio(buffer);
    return Response.json({ segments });
  } catch (err) {
    console.error("[rtr] transcription failed:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Transcription failed" }, { status: 502 });
  }
}
