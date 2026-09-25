import type { QuestionType } from "./types";

export const QTYPE_COLOR: Record<QuestionType, string> = {
  "higher-order": "var(--lime)",
  open: "var(--cyan)",
  closed: "var(--violet)",
  procedural: "var(--dim)",
  rhetorical: "var(--amber)",
};
