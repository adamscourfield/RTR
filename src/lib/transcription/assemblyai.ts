import "server-only";
import { splitSentences, wordCount } from "../analysis/patterns";
import type { Speaker, TranscriptSegment } from "../types";

// AssemblyAI REST flow: upload raw bytes -> create transcript job -> poll -> utterances.
// https://www.assemblyai.com/docs/speech-to-text/pre-recorded-audio
const API = "https://api.assemblyai.com/v2";
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 15 * 60 * 1000; // 15 min ceiling for a ~1hr lesson

interface Utterance {
  speaker: string;
  text: string;
  start: number; // ms
  end: number; // ms
}

interface TranscriptJob {
  id: string;
  status: "queued" | "processing" | "completed" | "error";
  error?: string;
  utterances?: Utterance[];
  text?: string;
}

export function assemblyAiAvailable(): boolean {
  return Boolean(process.env.ASSEMBLYAI_API_KEY);
}

function headers(extra?: Record<string, string>) {
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) throw new Error("ASSEMBLYAI_API_KEY is not configured");
  return { authorization: key, ...extra };
}

async function upload(audio: Buffer): Promise<string> {
  const res = await fetch(`${API}/upload`, {
    method: "POST",
    headers: headers({ "content-type": "application/octet-stream" }),
    body: new Uint8Array(audio),
  });
  if (!res.ok) throw new Error(`AssemblyAI upload failed: ${res.status} ${await res.text()}`);
  const { upload_url } = (await res.json()) as { upload_url: string };
  return upload_url;
}

async function createTranscript(audioUrl: string): Promise<string> {
  const res = await fetch(`${API}/transcript`, {
    method: "POST",
    headers: headers({ "content-type": "application/json" }),
    body: JSON.stringify({ audio_url: audioUrl, speaker_labels: true }),
  });
  if (!res.ok) throw new Error(`AssemblyAI transcript request failed: ${res.status} ${await res.text()}`);
  const { id } = (await res.json()) as { id: string };
  return id;
}

async function poll(id: string): Promise<TranscriptJob> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const res = await fetch(`${API}/transcript/${id}`, { headers: headers() });
    if (!res.ok) throw new Error(`AssemblyAI poll failed: ${res.status} ${await res.text()}`);
    const job = (await res.json()) as TranscriptJob;
    if (job.status === "completed") return job;
    if (job.status === "error") throw new Error(`AssemblyAI transcription failed: ${job.error ?? "unknown error"}`);
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error("AssemblyAI transcription timed out");
}

/**
 * Turn diarized utterances into our segment shape, guessing which speaker label is
 * the teacher: in a whole-class lesson the teacher reliably has the most total talk time.
 * Falls back to "unknown" when there's only one detected speaker (no real diarization).
 */
export function toSegments(utterances: Utterance[]): TranscriptSegment[] {
  const talkTime = new Map<string, number>();
  for (const u of utterances) talkTime.set(u.speaker, (talkTime.get(u.speaker) ?? 0) + (u.end - u.start));
  const ranked = [...talkTime.entries()].sort((a, b) => b[1] - a[1]);
  const teacherLabel = ranked[0]?.[0];
  const singleSpeaker = ranked.length <= 1;

  const speakerFor = (label: string): Speaker => (singleSpeaker ? "unknown" : label === teacherLabel ? "teacher" : "student");

  const segments: TranscriptSegment[] = [];
  utterances.forEach((u, i) => {
    // Long utterances (e.g. a teacher monologue) get split into sentence-level segments so
    // question detection and wait-time timing stay meaningful, spreading time proportionally.
    const sentences = splitSentences(u.text);
    const totalWords = sentences.reduce((a, s) => a + wordCount(s), 0) || 1;
    const durationMs = u.end - u.start;
    let cursor = u.start;
    sentences.forEach((s, j) => {
      const share = wordCount(s) / totalWords;
      const dur = sentences.length > 1 ? durationMs * share : durationMs;
      segments.push({
        id: `s${i}-${j}`,
        start: +(cursor / 1000).toFixed(2),
        end: +((cursor + dur) / 1000).toFixed(2),
        speaker: speakerFor(u.speaker),
        text: s,
      });
      cursor += dur;
    });
  });
  return segments.map((s, i) => ({ ...s, id: `s${i + 1}` }));
}

/** Transcribe a recorded lesson with speaker diarization. Requires ASSEMBLYAI_API_KEY. */
export async function transcribeAudio(audio: Buffer): Promise<TranscriptSegment[]> {
  const uploadUrl = await upload(audio);
  const id = await createTranscript(uploadUrl);
  const job = await poll(id);
  const utterances = job.utterances ?? [];
  if (!utterances.length) throw new Error("No speech detected in the recording");
  return toSegments(utterances);
}
