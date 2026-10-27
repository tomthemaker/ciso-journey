import { competencies } from "./data";
import type { LearnerState } from "./types";

// Keep the same origin-scoped key and serialized shape throughout modularization.
export const KEY = "ciso-journey-v1";
export const empty = (): LearnerState => ({
  completed: {},
  scores: Object.fromEntries(competencies),
  journal: [],
  achievements: [],
});

export function load(): LearnerState {
  try {
    const raw: Partial<LearnerState> | null = JSON.parse(
      localStorage.getItem(KEY) ?? "null",
    );
    if (raw && typeof raw === "object") {
      return {
        ...empty(),
        ...raw,
        scores: { ...empty().scores, ...raw.scores },
      };
    }
  } catch {
    // Retain the original v1 load behavior; recoverable migrations belong to F03.
  }
  return empty();
}

export function persist(state: LearnerState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}
