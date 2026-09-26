# RTR · Read the Room

Real-time, evidence-based feedback on what teachers say, checked against what students can then do.

RTR transcribes a lesson, scores it against a research-based rubric, classifies every question, measures wait time, pace and checks for understanding, and gives quoted evidence plus concrete next steps. Upload the exit ticket afterwards and RTR **triangulates**: did the delivery actually land? Across many lessons, the Insights view shows which behaviours and phrases go with higher student mastery.

## Features

| Area | What it does |
| --- | --- |
| **Live** (`/live`) | Browser mic → live transcript, question classification, wait-time/pace/check-for-understanding gauges and discreet coaching nudges. On stop, the recorded audio is (when configured) re-transcribed with speaker diarization for an accurate, teacher/student-labelled final transcript. Demo mode plays a scripted lesson with no mic. |
| **Import** (`/lessons/new`) | Paste/upload a transcript (WebVTT, SRT, `[00:01:02] T: …` lines, plain text) from an external recorder, or upload the audio file itself for diarized transcription. |
| **Lesson report** | Composite score, 7-dimension rubric with quoted evidence, timeline, question log with wait times, strengths, next steps, searchable transcript. |
| **Triangulation** | Upload exit-ticket / worksheet / assessment CSV (`student, score[, max]`) → mastery, distribution, and a delivery-vs-outcome verdict. |
| **Insights** (`/insights`) | Delivery vs mastery scatter, correlation of each behaviour with mastery, and teacher phrases distinctive to high- vs low-mastery lessons. |
| **Rubric** (`/rubric`) | The full rubric, level descriptors, weights and research sources, so every score can be checked. |

## Rubric

Seven dimensions, each scored 1–4 (Emerging → Exemplary): questioning depth, checking for understanding, explanation & modelling, retrieval & review, feedback quality, wait time, guided → independent practice. Sources include Rosenshine's Principles of Instruction, the Great Teaching Toolkit, Hattie & Timperley on feedback, Rowe on wait time, and the EEF guidance reports. See `src/lib/rubric.ts`.

## Transcription

Audio (from the live recorder or an uploaded file) is transcribed via [AssemblyAI](https://www.assemblyai.com/) with speaker diarization, which is what actually separates teacher from student talk — something a plain-text transcript can only do if it's already labelled `T:`/`S:`. Set `ASSEMBLYAI_API_KEY` to enable it. Audio is sent for transcription and then discarded; RTR never stores it. Without a key, live mode falls back to the browser's own (unlabelled, non-diarizing) speech recognition, and audio-file import is disabled.

## Analysis engines

- **Claude** (when `ANTHROPIC_API_KEY` is set): the transcript and deterministic timing metrics go to Claude, which returns structured rubric scores with verbatim evidence (`src/lib/analysis/claude.ts`). Model defaults to `claude-opus-5`; override with `RTR_MODEL`.
- **Pattern engine** (always available, no key needed): a transparent regex and timing engine (`src/lib/analysis/heuristic.ts`). It is fast and explainable, but crude. Treat its scores as indicative.

Timing metrics (wait time, pace, talk ratio) are always computed deterministically from timestamps, never estimated by the model.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional: add ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000. On first run, 12 synthetic demo lessons are seeded into `data/rtr-db.json`. Delete that file to reset.

Live transcription uses the browser's Web Speech API (Chrome/Edge). In other browsers, use demo mode or import a transcript.

## Known limitations

These are stated plainly on purpose:

- **Audio isn't the whole lesson.** Circulation, board work, body language and silent practice are invisible. Dimensions that audio captures only partially are labelled in the report.
- **Speaker separation** only happens with AssemblyAI configured (live recordings and audio-file import) or a manually labelled `T:`/`S:` text transcript. Without a key, live mode falls back to the browser's own speech recognition, which can't tell speakers apart.
- **Browser speech-to-text** (the live-coaching fallback) drops punctuation and struggles with noisy rooms; question detection falls back to interrogative openers. It also isn't private in the way it sounds — Chrome's built-in engine sends audio to Google's servers to produce it. The diarized AssemblyAI path used for the saved transcript doesn't have this problem, but you should still review whatever data processing terms your STT vendor offers before recording real students.
- **Diarization guesses teacher vs. student by talk time** (whoever talks most is labelled "teacher"), which is a good default in a whole-class lesson but can mislabel a lesson that's mostly independent/group work.
- **Correlation ≠ causation.** Insights come with sample-size warnings. Class, topic and assessment difficulty are confounders.
- **Storage** is a single JSON file. Replace `src/lib/store.ts` with a real database before multi-user or serverless deployment. There is no authentication yet.
- **Data protection.** Recording in classrooms involves minors. Consent, retention and DPIA requirements must be settled with schools before any real use.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Anthropic SDK · Zod
