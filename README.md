# RTR · Read the Room

Real-time, evidence-based feedback on what teachers say, checked against what students can then do.

RTR transcribes a lesson, scores it against a research-based rubric, classifies every question, measures wait time, pace and checks for understanding, and gives quoted evidence plus concrete next steps. Upload the exit ticket afterwards and RTR **triangulates**: did the delivery actually land? Across many lessons, the Insights view shows which behaviours and phrases go with higher student mastery.

## Features

| Area | What it does |
| --- | --- |
| **Live** (`/live`) | Browser mic → live transcript, question classification, wait-time/pace/check-for-understanding gauges and discreet coaching nudges. Demo mode plays a scripted lesson with no mic. Audio is never stored. |
| **Import** (`/lessons/new`) | Paste or upload transcripts from an external recorder: WebVTT, SRT, `[00:01:02] T: …` lines, or plain text. |
| **Lesson report** | Composite score, 7-dimension rubric with quoted evidence, timeline, question log with wait times, strengths, next steps, searchable transcript. |
| **Triangulation** | Upload exit-ticket / worksheet / assessment CSV (`student, score[, max]`) → mastery, distribution, and a delivery-vs-outcome verdict. |
| **Insights** (`/insights`) | Delivery vs mastery scatter, correlation of each behaviour with mastery, and teacher phrases distinctive to high- vs low-mastery lessons. |
| **Rubric** (`/rubric`) | The full rubric, level descriptors, weights and research sources, so every score can be checked. |

## Rubric

Seven dimensions, each scored 1–4 (Emerging → Exemplary): questioning depth, checking for understanding, explanation & modelling, retrieval & review, feedback quality, wait time, guided → independent practice. Sources include Rosenshine's Principles of Instruction, the Great Teaching Toolkit, Hattie & Timperley on feedback, Rowe on wait time, and the EEF guidance reports. See `src/lib/rubric.ts`.

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
- **Speaker separation.** Live mode uses one mic and can't tell teacher from student, so teacher-talk % shows only for imported transcripts with `T:`/`S:` labels. Real diarisation, or a second classroom mic, is the next step.
- **Browser speech-to-text** drops punctuation and struggles with noisy rooms. Question detection falls back to interrogative openers. For production, use a server-side ASR with word timestamps and diarisation.
- **Correlation ≠ causation.** Insights come with sample-size warnings. Class, topic and assessment difficulty are confounders.
- **Storage** is a single JSON file. Replace `src/lib/store.ts` with a real database before multi-user or serverless deployment. There is no authentication yet.
- **Data protection.** Recording in classrooms involves minors. Consent, retention and DPIA requirements must be settled with schools before any real use.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Anthropic SDK · Zod
