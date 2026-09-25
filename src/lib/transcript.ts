import type { Speaker, TranscriptSegment } from "./types";
import { wordCount } from "./analysis/patterns";

const SPEAKER_PREFIX = /^(teacher|t|student|s|pupil|p|class)\s*[:\-]\s*/i;
const TIMESTAMP = /(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?/;
const ASSUMED_WPM = 150;

function toSec(m: RegExpMatchArray) {
  return (m[1] ? +m[1] * 3600 : 0) + +m[2] * 60 + +m[3] + (m[4] ? +m[4] / 10 ** m[4].length : 0);
}

function speakerOf(prefix: string | undefined): Speaker {
  if (!prefix) return "unknown";
  return /^t/i.test(prefix) ? "teacher" : "student";
}

/**
 * Parse a transcript from an external recorder. Supports:
 *  - WebVTT / SRT cues (`00:01:02.000 --> 00:01:05.000`)
 *  - Lines like `[00:01:02] T: text` or `12:30 Teacher: text`
 *  - Plain text (timings estimated at 150 wpm, pauses unknown)
 * Speaker prefixes T:/Teacher:/S:/Student: are recognised on any format.
 */
export function parseTranscript(raw: string): TranscriptSegment[] {
  const text = raw.replace(/^WEBVTT.*$/m, "").trim();
  const segs: TranscriptSegment[] = [];

  if (/-->/.test(text)) {
    for (const block of text.split(/\n\s*\n/)) {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      const cueIdx = lines.findIndex((l) => l.includes("-->"));
      if (cueIdx < 0) continue;
      const [a, b] = lines[cueIdx].split("-->");
      const ma = a.match(TIMESTAMP);
      const mb = b.match(TIMESTAMP);
      if (!ma || !mb) continue;
      let body = lines.slice(cueIdx + 1).join(" ").replace(/<[^>]+>/g, "");
      const vSpeaker = lines[cueIdx + 1]?.match(/^<v\s+([^>]+)>/i)?.[1];
      const p = body.match(SPEAKER_PREFIX);
      if (p) body = body.slice(p[0].length);
      segs.push({ id: "", start: toSec(ma), end: toSec(mb), speaker: speakerOf(p?.[1] ?? vSpeaker), text: body.trim() });
    }
    return number(segs);
  }

  let clock = 0;
  for (const rawLine of text.split("\n")) {
    let line = rawLine.trim();
    if (!line) continue;
    let start: number | null = null;
    const ts = line.match(new RegExp(`^\\[?${TIMESTAMP.source}\\]?\\s*`));
    if (ts) {
      start = toSec(ts);
      line = line.slice(ts[0].length);
    }
    const p = line.match(SPEAKER_PREFIX);
    if (p) line = line.slice(p[0].length);
    if (!line) continue;
    const dur = Math.max(1, (wordCount(line) / ASSUMED_WPM) * 60);
    const s = start ?? clock;
    segs.push({ id: "", start: s, end: s + dur, speaker: speakerOf(p?.[1]), text: line });
    clock = s + dur + 1;
  }
  // Fix end times when explicit timestamps are present so segments don't overlap.
  for (let i = 0; i < segs.length - 1; i++) {
    if (segs[i].end > segs[i + 1].start) segs[i].end = Math.max(segs[i].start + 0.5, segs[i + 1].start - 0.3);
  }
  return number(segs);
}

function number(segs: TranscriptSegment[]) {
  return segs.map((s, i) => ({ ...s, id: `s${i + 1}` }));
}

export function formatClock(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const mm = h ? m.toString().padStart(2, "0") : m.toString();
  return `${h ? h + ":" : ""}${mm}:${s.toString().padStart(2, "0")}`;
}
