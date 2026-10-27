/** Legacy v1 values remain independent of future resource/recall/assessment records. */
export type Task = [id: string, title: string, outcome: string];
export interface Phase {
  id: string;
  months: string;
  name: string;
  desc: string;
  tasks: Task[];
}
export interface LearningResource {
  linkedinTitle: string;
  linkedinUrl: string;
  officialTitle: string;
  officialUrl: string;
  searchTerms: string;
  focus: string;
}
export interface HistoryEntry {
  id: string;
  date: string;
  title: string;
  body: string;
  [key: string]: unknown;
}
export type HistoryKind = "journal" | "achievements";
export interface LearnerState {
  completed: Record<string, boolean>;
  scores: Record<string, number>;
  journal: HistoryEntry[];
  achievements: HistoryEntry[];
  // Preserve extra JSON fields from compatible v1 backups.
  [key: string]: unknown;
}
export interface V1Backup {
  app: "CISO Journey";
  version: 1;
  exportedAt: string;
  data: LearnerState;
}
