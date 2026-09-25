import type { Lesson, LessonAnalysis } from "../types";
import { claudeAnalysis, claudeAvailable } from "./claude";
import { heuristicAnalysis } from "./heuristic";

export async function analyseLesson(lesson: Pick<Lesson, "segments" | "subject" | "yearGroup" | "title">): Promise<LessonAnalysis> {
  if (claudeAvailable()) {
    try {
      return await claudeAnalysis(lesson.segments, `${lesson.subject}, ${lesson.yearGroup}: "${lesson.title}"`);
    } catch (err) {
      console.error("[rtr] Claude analysis failed, falling back to heuristic engine:", err);
    }
  }
  return heuristicAnalysis(lesson.segments);
}
