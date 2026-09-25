"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FileText, Loader2, Sparkles } from "lucide-react";

const EXAMPLE = `[00:00:04] T: Morning. Do now on the board — three minutes, no talking.
[00:03:10] T: Pens down. What did we learn last lesson about equivalent fractions? Hands down, I'm going to pick. Leo?
[00:03:16] S: You times the top and bottom by the same number.
[00:03:20] T: That's right because the value stays the same. Why does it stay the same?
[00:03:25] S: Because it's like multiplying by one.
[00:03:29] T: Today we are learning to add fractions with different denominators. Watch me first.`;

export function ImportForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [meta, setMeta] = useState({ title: "", subject: "", yearGroup: "", teacher: "" });
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/lessons", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: meta.title || "Imported lesson",
        subject: meta.subject || "General",
        yearGroup: meta.yearGroup,
        teacher: meta.teacher || "Me",
        source: "import",
        rawTranscript: raw,
      }),
    });
    if (!res.ok) {
      setBusy(false);
      setError((await res.json().catch(() => ({}))).error ?? "Import failed");
      return;
    }
    router.push(`/lessons/${(await res.json()).id}`);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 rise">
      <div className="glass p-6">
        <div className="grid sm:grid-cols-2 gap-3">
          <input className="field sm:col-span-2" placeholder="Lesson title" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
          <input className="field" placeholder="Subject" value={meta.subject} onChange={(e) => setMeta({ ...meta, subject: e.target.value })} />
          <input className="field" placeholder="Year group / class" value={meta.yearGroup} onChange={(e) => setMeta({ ...meta, yearGroup: e.target.value })} />
          <input className="field sm:col-span-2" placeholder="Teacher" value={meta.teacher} onChange={(e) => setMeta({ ...meta, teacher: e.target.value })} />
        </div>
        <textarea
          className="field font-mono text-xs mt-3"
          rows={14}
          placeholder="Paste a transcript, or choose a .vtt / .srt / .txt file from your recording device…"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".vtt,.srt,.txt"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setRaw(await f.text());
              if (!meta.title) setMeta((m) => ({ ...m, title: f.name.replace(/\.[^.]+$/, "") }));
            }}
          />
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            <FileText size={15} /> Choose file
          </button>
          <button className="text-xs text-muted hover:text-text px-2" onClick={() => setRaw(EXAMPLE)}>
            Paste example
          </button>
          <button className="btn btn-primary sm:ml-auto" disabled={!raw.trim() || busy} onClick={submit}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} {busy ? "Analysing…" : "Analyse lesson"}
          </button>
        </div>
        {error && <div className="mt-3 text-sm text-red">{error}</div>}
      </div>
      <div className="glass p-6 text-sm flex flex-col gap-4">
        <div className="eyebrow">Supported formats</div>
        <div>
          <div className="font-medium">WebVTT / SRT</div>
          <div className="text-muted mt-0.5">Exported by most recorders and transcription services. Timings are used for wait-time analysis.</div>
        </div>
        <div>
          <div className="font-medium">Timestamped lines</div>
          <div className="text-muted mt-0.5 font-mono text-xs">[00:03:20] T: text</div>
        </div>
        <div>
          <div className="font-medium">Plain text</div>
          <div className="text-muted mt-0.5">Works, but timings are estimated so wait time can&apos;t be measured.</div>
        </div>
        <div className="text-muted border-t border-line pt-4">
          Prefix lines with <span className="font-mono text-text">T:</span> / <span className="font-mono text-text">S:</span> (or Teacher/Student) to unlock teacher-talk ratio.
        </div>
      </div>
    </div>
  );
}
