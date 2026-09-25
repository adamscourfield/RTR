import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LessonSummary } from "@/lib/types";
import { formatDate, formatDuration, scoreColor } from "./ui";

export function LessonRow({ lesson }: { lesson: LessonSummary }) {
  const a = lesson.analysis;
  return (
    <Link
      href={`/lessons/${lesson.id}`}
      className="group flex items-center gap-4 rounded-2xl px-3 py-3 hover:bg-panel-strong transition-colors"
    >
      <div
        className="grid place-items-center size-12 shrink-0 rounded-xl border font-semibold tabular-nums"
        style={{
          borderColor: a ? scoreColor(a.overall) : "var(--line)",
          color: a ? scoreColor(a.overall) : "var(--muted)",
          boxShadow: a ? `0 0 24px -10px ${scoreColor(a.overall)}` : undefined,
        }}
      >
        {a ? a.overall : "–"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{lesson.title}</div>
        <div className="text-xs text-muted truncate mt-0.5">
          {lesson.subject}
          {lesson.yearGroup && ` · ${lesson.yearGroup}`} · {formatDate(lesson.date)}
          {a && ` · ${formatDuration(a.metrics.durationSec)}`}
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-2">
        {lesson.source === "demo" && <span className="chip">demo</span>}
        {lesson.assessment ? (
          <span className="chip" style={{ color: "var(--pink)", borderColor: "color-mix(in srgb, var(--pink) 35%, transparent)" }}>
            {lesson.assessment.masteryPct}% mastery
          </span>
        ) : (
          <span className="chip">no exit ticket</span>
        )}
      </div>
      <ChevronRight size={16} className="text-dim group-hover:text-text transition-colors shrink-0" />
    </Link>
  );
}
