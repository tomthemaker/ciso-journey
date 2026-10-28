import { competencies } from "./data.ts";
import type { LearnerState } from "./types.ts";

export const empty = (): LearnerState => ({
  completed: {},
  scores: Object.fromEntries(competencies),
  journal: [],
  achievements: [],
});
