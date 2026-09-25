"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";

export function ReportActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"analyse" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reanalyse() {
    setBusy("analyse");
    setError(null);
    const res = await fetch(`/api/lessons/${id}/analyse`, { method: "POST" });
    if (!res.ok) setError("Re-analysis failed");
    setBusy(null);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Delete this lesson and its transcript permanently?")) return;
    setBusy("delete");
    await fetch(`/api/lessons/${id}`, { method: "DELETE" });
    router.push("/lessons");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red">{error}</span>}
      <button className="btn btn-ghost" onClick={reanalyse} disabled={busy !== null}>
        <RefreshCw size={15} className={busy === "analyse" ? "animate-spin" : ""} /> Re-analyse
      </button>
      <button className="btn btn-ghost !px-3" onClick={remove} disabled={busy !== null} aria-label="Delete lesson">
        <Trash2 size={15} />
      </button>
    </div>
  );
}
