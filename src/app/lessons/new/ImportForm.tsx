"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FileAudio, FileText, Loader2, Sparkles } from "lucide-react";

const EXAMPLE = `[00:00:04] T: Morning. Do now on the board — three minutes, no talking.
[00:03:10] T: Pens down. What did we learn last lesson about equivalent fractions? Hands down, I'm going to pick. Leo?
[00:03:16] S: You times the top and bottom by the same number.
[00:03:20] T: That's right because the value stays the same. Why does it stay the same?
[00:03:25] S: Because it's like multiplying by one.
[00:03:29] T: Today we are learning to add fractions with different denominators. Watch me first.`;

export function ImportForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"text" | "audio">("text");
  const [transcriptionOn, setTranscriptionOn] = useState<boolean | null>(null);
  const [meta, setMeta] = useState({ title: "", subject: "", yearGroup: "", teacher: "" });
  const [raw, setRaw] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<"idle" | "transcribing" | "analysing">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setTranscriptionOn(Boolean(d.transcription)))
      .catch(() => setTranscriptionOn(false));
  }, []);

  async function submitText() {
    setBusy(true);
    setStage("analysing");
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
      setStage("idle");
      setError((await res.json().catch(() => ({}))).error ?? "Import failed");
      return;
    }
    router.push(`/lessons/${(await res.json()).id}`);
  }

  async function submitAudio() {
    if (!audioFile) return;
    setBusy(true);
    setError(null);
    setStage("transcribing");
    const form = new FormData();
    form.append("audio", audioFile);
    const tres = await fetch("/api/transcribe", { method: "POST", body: form });
    if (!tres.ok) {
      setBusy(false);
      setStage("idle");
      setError((await tres.json().catch(() => ({}))).error ?? "Transcription failed");
      return;
    }
    const { segments } = await tres.json();
    setStage("analysing");
    const res = await fetch("/api/lessons", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: meta.title || audioFile.name.replace(/\.[^.]+$/, ""),
        subject: meta.subject || "General",
        yearGroup: meta.yearGroup,
        teacher: meta.teacher || "Me",
        source: "import",
        segments,
      }),
    });
    if (!res.ok) {
      setBusy(false);
      setStage("idle");
      setError((await res.json().catch(() => ({}))).error ?? "Import failed");
      return;
    }
    router.push(`/lessons/${(await res.json()).id}`);
  }

  const canSubmit = tab === "text" ? raw.trim().length > 0 : Boolean(audioFile);
  const busyLabel = stage === "transcribing" ? "Transcribing audio…" : "Analysing…";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 rise">
      <div className="glass p-6">
        <div className="grid sm:grid-cols-2 gap-3">
          <input className="field sm:col-span-2" placeholder="Lesson title" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
          <input className="field" placeholder="Subject" value={meta.subject} onChange={(e) => setMeta({ ...meta, subject: e.target.value })} />
          <input className="field" placeholder="Year group / class" value={meta.yearGroup} onChange={(e) => setMeta({ ...meta, yearGroup: e.target.value })} />
          <input className="field sm:col-span-2" placeholder="Teacher" value={meta.teacher} onChange={(e) => setMeta({ ...meta, teacher: e.target.value })} />
        </div>

        <div className="mt-5 flex gap-1 p-1 rounded-full bg-well border border-line self-start w-fit">
          <button onClick={() => setTab("text")} className={`px-4 h-9 rounded-full text-sm transition-colors ${tab === "text" ? "bg-panel-strong text-text shadow-sm" : "text-muted hover:text-text"}`}>
            Transcript
          </button>
          <button onClick={() => setTab("audio")} className={`px-4 h-9 rounded-full text-sm transition-colors ${tab === "audio" ? "bg-panel-strong text-text shadow-sm" : "text-muted hover:text-text"}`}>
            Audio recording
          </button>
        </div>

        {tab === "text" ? (
          <>
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
            </div>
          </>
        ) : (
          <div className="mt-3">
            {transcriptionOn === false && (
              <div className="text-sm rounded-xl p-3 border border-amber/30 bg-amber/5 text-amber mb-3">
                Audio transcription isn&apos;t configured on this server (no <span className="font-mono text-xs">ASSEMBLYAI_API_KEY</span>). Use the Transcript tab instead.
              </div>
            )}
            <input
              ref={audioRef}
              type="file"
              accept="audio/*,.m4a,.mp3,.wav,.webm,.ogg"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setAudioFile(f);
                if (!meta.title) setMeta((m) => ({ ...m, title: f.name.replace(/\.[^.]+$/, "") }));
              }}
            />
            <button
              onClick={() => audioRef.current?.click()}
              disabled={transcriptionOn === false}
              className="w-full rounded-2xl border-2 border-dashed border-line hover:border-line-strong disabled:opacity-50 py-10 flex flex-col items-center gap-3 text-center transition-colors"
            >
              <FileAudio size={28} className="text-muted" />
              {audioFile ? (
                <div>
                  <div className="font-medium text-sm">{audioFile.name}</div>
                  <div className="text-xs text-dim mt-0.5">{(audioFile.size / 1024 / 1024).toFixed(1)} MB · click to change</div>
                </div>
              ) : (
                <div>
                  <div className="font-medium text-sm">Choose an audio file</div>
                  <div className="text-xs text-dim mt-0.5">From a recorder, phone or lapel mic — mp3, m4a, wav, webm…</div>
                </div>
              )}
            </button>
            <p className="text-xs text-dim mt-3 leading-relaxed">
              Transcribed with speaker diarization, so teacher and student talk are separated automatically — something a plain
              text transcript usually can&apos;t give you. The audio itself is sent for transcription and then discarded; it
              isn&apos;t stored by RTR.
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button className="btn btn-primary sm:ml-auto" disabled={!canSubmit || busy} onClick={tab === "text" ? submitText : submitAudio}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} {busy ? busyLabel : "Analyse lesson"}
          </button>
        </div>
        {error && <div className="mt-3 text-sm text-red">{error}</div>}
      </div>
      <div className="glass p-6 text-sm flex flex-col gap-4">
        <div className="eyebrow">Supported formats</div>
        <div>
          <div className="font-medium">Audio recording</div>
          <div className="text-muted mt-0.5">From an external recorder or lapel mic. Transcribed with speaker diarization — teacher and student talk are separated automatically.</div>
        </div>
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
          Prefix lines with <span className="font-mono text-text">T:</span> / <span className="font-mono text-text">S:</span> (or Teacher/Student) to unlock teacher-talk ratio in a text transcript.
        </div>
      </div>
    </div>
  );
}
