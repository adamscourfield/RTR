import { RUBRIC, LEVEL_NAMES } from "@/lib/rubric";
import { PageHeader, levelColor } from "@/components/ui";

export const metadata = { title: "Rubric · RTR" };

export default function RubricPage() {
  return (
    <>
      <PageHeader eyebrow="Transparency" title="The rubric behind every score" />
      <p className="text-muted max-w-2xl -mt-4 mb-8 rise">
        RTR scores seven dimensions drawn from well-replicated research on effective instruction. Each is scored 1–4 with quoted evidence from
        the transcript. Weights reflect how reliably each can be judged from audio, not how much it matters.
      </p>
      <div className="flex flex-col gap-4">
        {RUBRIC.map((d, i) => (
          <article key={d.id} className="glass p-6 rise" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{d.name}</h2>
                <p className="text-sm text-muted mt-1 max-w-2xl">{d.evidence}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <span className="chip">weight ×{d.weight}</span>
                <span className="chip">audio reliability: {d.audioReliability}</span>
              </div>
            </div>
            <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {d.levels.map((l, li) => (
                <div key={li} className="rounded-xl p-3 border border-line bg-well">
                  <div className="text-xs font-medium" style={{ color: levelColor(li + 1) }}>
                    {li + 1} · {LEVEL_NAMES[li]}
                  </div>
                  <div className="text-[13px] text-muted mt-1.5 leading-relaxed">{l}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {d.sources.map((s) => (
                <span key={s} className="chip">{s}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
