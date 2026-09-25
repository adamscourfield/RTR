"use client";

import { useMemo, useState } from "react";
import { QTYPE_COLOR } from "@/lib/qtype";
import { formatClock } from "@/lib/transcript";
import type { ClassifiedQuestion, TranscriptSegment } from "@/lib/types";

type Filter = "all" | "questions" | "students";

export function TranscriptView({ segments, questions }: { segments: TranscriptSegment[]; questions: ClassifiedQuestion[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const t0 = segments[0]?.start ?? 0;

  const qBySeg = useMemo(() => {
    const m = new Map<string, ClassifiedQuestion[]>();
    for (const q of questions) m.set(q.segmentId, [...(m.get(q.segmentId) ?? []), q]);
    return m;
  }, [questions]);

  const visible = segments.filter((s) => {
    if (filter === "questions" && !qBySeg.has(s.id)) return false;
    if (filter === "students" && s.speaker !== "student") return false;
    if (query && !s.text.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  function highlight(s: TranscriptSegment) {
    const qs = qBySeg.get(s.id);
    if (!qs) return s.text;
    const parts: React.ReactNode[] = [];
    let rest = s.text;
    qs.forEach((q, i) => {
      const idx = rest.indexOf(q.text);
      if (idx < 0) return;
      parts.push(rest.slice(0, idx));
      parts.push(
        <mark
          key={i}
          className="rounded px-1 -mx-0.5 text-text"
          style={{ background: `color-mix(in srgb, ${QTYPE_COLOR[q.type]} 22%, transparent)`, boxShadow: `inset 0 -2px 0 ${QTYPE_COLOR[q.type]}` }}
          title={q.type}
        >
          {q.text}
        </mark>,
      );
      rest = rest.slice(idx + q.text.length);
    });
    parts.push(rest);
    return parts;
  }

  return (
    <div className="glass overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-3 p-3 border-b border-line">
        <div className="flex gap-1 p-1 rounded-full bg-well border border-line self-start">
          {(["all", "questions", "students"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 h-8 rounded-full text-xs capitalize transition-colors ${filter === f ? "bg-panel-strong text-text" : "text-muted hover:text-text"}`}
            >
              {f}
            </button>
          ))}
        </div>
        <input className="field !h-10 sm:max-w-xs sm:ml-auto" placeholder="Search transcript…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="max-h-[560px] overflow-y-auto divide-y divide-line/60">
        {visible.length === 0 && <div className="p-6 text-sm text-muted">Nothing matches.</div>}
        {visible.map((s) => (
          <div key={s.id} id={`seg-${s.id}`} className="grid grid-cols-[48px_1fr] gap-3 px-4 py-3 scroll-mt-24 target:bg-violet/10 transition-colors">
            <div className="font-mono text-[11px] text-dim pt-0.5">{formatClock(s.start - t0)}</div>
            <div className="min-w-0">
              <div className={`text-[10px] font-mono uppercase tracking-widest mb-1 ${s.speaker === "student" ? "text-pink" : "text-cyan"}`}>
                {s.speaker === "unknown" ? "speaker" : s.speaker}
              </div>
              <p className="text-sm leading-relaxed text-text">{highlight(s)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
