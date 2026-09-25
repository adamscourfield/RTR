"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FileUp, X } from "lucide-react";
import { triangulate } from "@/lib/triangulate";
import type { Assessment } from "@/lib/types";
import { scoreColor } from "./ui";

const SAMPLE = `student,score,max
Amara,4,5
Jamal,5,5
Priya,3,5
Tom,2,5
Sofia,4,5`;

export function AssessmentPanel({
  lessonId,
  overall,
  assessment,
}: {
  lessonId: string;
  overall: number | null;
  assessment: Assessment | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState("");
  const [kind, setKind] = useState<Assessment["kind"]>("exit-ticket");
  const [defaultMax, setDefaultMax] = useState(10);
  const [threshold, setThreshold] = useState(70);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/lessons/${lessonId}/assessment`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, csv, defaultMax, masteryThreshold: threshold }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Upload failed");
      return;
    }
    setCsv("");
    router.refresh();
  }

  async function clear() {
    await fetch(`/api/lessons/${lessonId}/assessment`, { method: "DELETE" });
    router.refresh();
  }

  if (assessment) {
    const verdict = overall !== null ? triangulate(overall, assessment.masteryPct) : null;
    const pcts = assessment.results.map((r) => (r.score / r.max) * 100);
    const bins = [0, 20, 40, 60, 80].map((lo) => pcts.filter((p) => p >= lo && (lo === 80 ? p <= 100 : p < lo + 20)).length);
    const maxBin = Math.max(1, ...bins);
    const struggling = assessment.results.filter((r) => (r.score / r.max) * 100 < assessment.masteryThreshold);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">
        <div className="glass p-5">
          <div className="flex items-center justify-between">
            <div className="eyebrow">{assessment.kind.replace("-", " ")} · {assessment.results.length} students</div>
            <button onClick={clear} className="text-dim hover:text-text" aria-label="Remove results">
              <X size={14} />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <div className="text-4xl font-semibold tabular-nums" style={{ color: "var(--pink)" }}>
                {assessment.masteryPct}%
              </div>
              <div className="text-xs text-muted mt-1">reached mastery (≥{assessment.masteryThreshold}%)</div>
            </div>
            <div>
              <div className="text-4xl font-semibold tabular-nums">{assessment.meanPct}%</div>
              <div className="text-xs text-muted mt-1">mean score</div>
            </div>
          </div>
          <div className="mt-6 flex items-end gap-2 h-24">
            {bins.map((b, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md"
                  style={{
                    height: `${(b / maxBin) * 100}%`,
                    minHeight: b ? 4 : 0,
                    background: i * 20 >= assessment.masteryThreshold - 10 ? "var(--pink)" : "color-mix(in srgb, var(--pink) 35%, transparent)",
                  }}
                />
                <span className="font-mono text-[10px] text-dim">{i * 20}+</span>
              </div>
            ))}
          </div>
          {struggling.length > 0 && (
            <div className="mt-5">
              <div className="eyebrow !text-[10px]">Below threshold</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {struggling.map((r) => (
                  <span key={r.student} className="chip">
                    {r.student} · {r.score}/{r.max}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {verdict && overall !== null && (
          <div className="glass p-5 relative overflow-hidden">
            <div className="absolute -top-24 -left-16 size-56 rounded-full bg-pink/10 blur-3xl" />
            <div className="eyebrow">Triangulation</div>
            <div className="mt-3 text-2xl font-semibold tracking-tight">{verdict.headline}</div>
            <p className="mt-2 text-sm text-muted leading-relaxed">{verdict.detail}</p>
            <div className="mt-6 grid grid-cols-[auto_1fr_auto] items-center gap-3 text-xs">
              <span className="text-muted w-20">Delivery</span>
              <div className="h-2 rounded-full bg-track overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${overall}%`, background: scoreColor(overall) }} />
              </div>
              <span className="tabular-nums w-8 text-right">{overall}</span>
              <span className="text-muted w-20">Mastery</span>
              <div className="h-2 rounded-full bg-track overflow-hidden">
                <div className="h-full rounded-full bg-pink" style={{ width: `${assessment.masteryPct}%` }} />
              </div>
              <span className="tabular-nums w-8 text-right">{assessment.masteryPct}</span>
            </div>
            <p className="mt-6 text-[11px] text-dim leading-relaxed">
              One lesson is one data point. Treat this as a prompt for reflection, not a verdict — patterns across many lessons are what matter (see Insights).
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="glass p-5">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-5">
        <div>
          <textarea
            className="field font-mono text-xs"
            rows={8}
            placeholder={`Paste results as CSV — one student per row:\n\n${SAMPLE}`}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,.txt"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setCsv(await f.text());
              }}
            />
            <button className="btn btn-ghost h-9" onClick={() => fileRef.current?.click()}>
              <FileUp size={14} /> Choose CSV
            </button>
            <button className="text-xs text-muted hover:text-text px-2" onClick={() => setCsv(SAMPLE)}>
              Use sample
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <label className="text-xs text-muted">
            Type
            <select className="field mt-1" value={kind} onChange={(e) => setKind(e.target.value as Assessment["kind"])}>
              <option value="exit-ticket">Exit ticket</option>
              <option value="worksheet">Worksheet</option>
              <option value="assessment">Assessment</option>
            </select>
          </label>
          <label className="text-xs text-muted">
            Max score (if no max column)
            <input type="number" min={1} className="field mt-1" value={defaultMax} onChange={(e) => setDefaultMax(+e.target.value || 1)} />
          </label>
          <label className="text-xs text-muted">
            Mastery threshold %
            <input type="number" min={1} max={100} className="field mt-1" value={threshold} onChange={(e) => setThreshold(+e.target.value || 70)} />
          </label>
          <button className="btn btn-primary mt-auto" onClick={submit} disabled={!csv.trim() || busy}>
            {busy ? "Uploading…" : "Upload & triangulate"}
          </button>
          {error && <div className="text-xs text-red">{error}</div>}
        </div>
      </div>
    </div>
  );
}
