import Link from "next/link";
import { Mic, Upload } from "lucide-react";
import { listLessons } from "@/lib/store";
import { LessonRow } from "@/components/LessonRow";
import { EmptyState, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LessonsPage() {
  const lessons = await listLessons();
  return (
    <>
      <PageHeader eyebrow="Library" title="Lessons">
        <Link href="/lessons/new" className="btn btn-ghost">
          <Upload size={16} /> Import
        </Link>
        <Link href="/live" className="btn btn-primary">
          <Mic size={16} /> Record
        </Link>
      </PageHeader>
      {lessons.length ? (
        <div className="glass p-2 sm:p-3 rise">
          {lessons.map((l) => (
            <LessonRow key={l.id} lesson={l} />
          ))}
        </div>
      ) : (
        <EmptyState title="No lessons yet">Record a live lesson or import a transcript to get started.</EmptyState>
      )}
    </>
  );
}
