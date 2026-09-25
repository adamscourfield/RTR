import type { Lesson } from "./types";

const STOP = new Set("the a an and or but to of in on at for is it that this we you i so be are was with as if do what can your our they them then there".split(" "));

function ngrams(text: string, n: number): string[] {
  const words = text.toLowerCase().replace(/[^a-z' ]+/g, " ").split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i + n <= words.length; i++) {
    const g = words.slice(i, i + n);
    if (g.every((w) => STOP.has(w))) continue;
    out.push(g.join(" "));
  }
  return out;
}

export interface Phrase {
  phrase: string;
  high: number; // lessons in the high-outcome group using it
  low: number;
  score: number; // smoothed log-odds, + favours high-outcome lessons
}

/**
 * Teacher phrases that distinguish high-outcome lessons from low-outcome ones.
 * Counts each phrase once per lesson (document frequency) so one talkative lesson can't dominate.
 */
export function distinctivePhrases(lessons: Lesson[], minLessons = 2): { high: Phrase[]; low: Phrase[]; groups: { high: number; low: number } } {
  const scored = lessons.filter((l) => l.assessment).sort((a, b) => b.assessment!.masteryPct - a.assessment!.masteryPct);
  const half = Math.floor(scored.length / 2);
  const hi = scored.slice(0, half);
  const lo = scored.slice(scored.length - half);
  // Phrases used in only one subject are almost always content ("common denominator"), not pedagogy.
  const subjectsByPhrase = new Map<string, Set<string>>();
  const df = (group: Lesson[]) => {
    const m = new Map<string, number>();
    for (const l of group) {
      const set = new Set<string>();
      for (const s of l.segments) if (s.speaker !== "student") for (const n of [2, 3, 4]) ngrams(s.text, n).forEach((g) => set.add(g));
      set.forEach((g) => {
        m.set(g, (m.get(g) ?? 0) + 1);
        if (!subjectsByPhrase.has(g)) subjectsByPhrase.set(g, new Set());
        subjectsByPhrase.get(g)!.add(l.subject.toLowerCase());
      });
    }
    return m;
  };
  const dh = df(hi);
  const dl = df(lo);
  const all = new Set([...dh.keys(), ...dl.keys()]);
  const phrases: Phrase[] = [];
  for (const p of all) {
    const h = dh.get(p) ?? 0;
    const l = dl.get(p) ?? 0;
    if (h + l < minLessons) continue;
    if ((subjectsByPhrase.get(p)?.size ?? 0) < 2) continue;
    const score = Math.log((h + 0.5) / (hi.length - h + 0.5)) - Math.log((l + 0.5) / (lo.length - l + 0.5));
    phrases.push({ phrase: p, high: h, low: l, score: +score.toFixed(2) });
  }
  // Prefer longer phrases when a shorter one is contained in a higher-ranked longer one with the same counts.
  // Drop phrases that overlap a higher-ranked phrase with identical counts (fragments of the same utterance).
  const overlaps = (a: string, b: string) => {
    const bw = ngrams(b, 2);
    return ngrams(a, 2).some((g) => bw.includes(g));
  };
  const dedupe = (list: Phrase[]) => {
    const kept: Phrase[] = [];
    for (const p of list) if (!kept.some((q) => q.high === p.high && q.low === p.low && overlaps(p.phrase, q.phrase))) kept.push(p);
    return kept;
  };
  const byScore = [...phrases].sort((a, b) => b.score - a.score || b.phrase.length - a.phrase.length);
  const byScoreAsc = [...phrases].sort((a, b) => a.score - b.score || b.phrase.length - a.phrase.length);
  return {
    high: dedupe(byScore.filter((p) => p.score > 1)).slice(0, 12),
    low: dedupe(byScoreAsc.filter((p) => p.score < -1)).slice(0, 12),
    groups: { high: hi.length, low: lo.length },
  };
}
