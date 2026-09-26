export type Speaker = "teacher" | "student" | "unknown";

export interface TranscriptSegment {
  id: string;
  /** Seconds from lesson start. */
  start: number;
  end: number;
  speaker: Speaker;
  text: string;
}

export type QuestionType = "closed" | "open" | "higher-order" | "procedural" | "rhetorical";

export interface ClassifiedQuestion {
  segmentId: string;
  text: string;
  type: QuestionType;
  /** Seconds between the question ending and the next utterance. null when unknowable. */
  waitTime: number | null;
}

export type DimensionId =
  | "questioning"
  | "checking"
  | "explanation"
  | "retrieval"
  | "feedback"
  | "waitTime"
  | "practice";

export interface DimensionScore {
  id: DimensionId;
  /** 1 (emerging) – 4 (exemplary). */
  score: number;
  rationale: string;
  evidence: { segmentId: string; quote: string }[];
}

export interface LessonMetrics {
  durationSec: number;
  teacherWords: number;
  studentWords: number;
  wordsPerMinute: number;
  /** % of words spoken by the teacher; null when speaker labels are unavailable. */
  teacherTalkPct: number | null;
  questionCount: number;
  questionsPerTenMin: number;
  openQuestionPct: number;
  meanWaitTime: number | null;
  checksForUnderstanding: number;
  genericPraise: number;
  specificPraise: number;
}

export interface LessonAnalysis {
  engine: "claude" | "heuristic";
  analysedAt: string;
  /** 0–100 composite of dimension scores. */
  overall: number;
  dimensions: DimensionScore[];
  questions: ClassifiedQuestion[];
  metrics: LessonMetrics;
  strengths: string[];
  nextSteps: string[];
  summary: string;
}

export interface StudentResult {
  student: string;
  score: number;
  max: number;
}

export interface Assessment {
  kind: "exit-ticket" | "worksheet" | "assessment";
  uploadedAt: string;
  results: StudentResult[];
  /** Mean % score across students. */
  meanPct: number;
  /** % of students at or above the mastery threshold. */
  masteryPct: number;
  masteryThreshold: number;
}

export interface Lesson {
  id: string;
  title: string;
  subject: string;
  yearGroup: string;
  teacher: string;
  date: string;
  source: "live" | "import" | "demo";
  segments: TranscriptSegment[];
  analysis: LessonAnalysis | null;
  assessment: Assessment | null;
}

export type LessonSummary = Omit<Lesson, "segments">;
