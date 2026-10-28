import { validateReviewProgress } from "./reviews.ts";
import { validateScenarioResponses } from "./scenario-responses.ts";
import { validateQuestionAttempts } from "./question-attempts.ts";
import { validateResourceProgress } from "./resource-progress.ts";
import { validateReadingProgress } from "./reading-progress.ts";
import { empty } from "./state.ts";
import type { HistoryEntry, LearnerState, Backup } from "./types.ts";

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validCalendarDate(value: string): boolean {
  if (!/^\d{4,}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  // Date.parse alone normalizes impossible days into another month.
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= days[month - 1] &&
    Number.isFinite(Date.parse(value))
  );
}

function history(value: unknown, kind: string): HistoryEntry[] {
  if (!Array.isArray(value))
    throw new Error("Invalid backup data. Current progress has not changed.");
  const ids = new Set<string>();
  for (const entry of value) {
    if (
      !record(entry) ||
      typeof entry.id !== "string" ||
      !entry.id ||
      typeof entry.date !== "string" ||
      !validCalendarDate(entry.date) ||
      typeof entry.title !== "string" ||
      typeof entry.body !== "string" ||
      ids.has(entry.id)
    ) {
      throw new Error(
        "Invalid " + kind + " entry. Current progress has not changed.",
      );
    }
    ids.add(entry.id);
  }
  return value as HistoryEntry[];
}

/** Validate the entire payload before confirmation or persistence. Never coerce values. */
export function validateBackup(backup: unknown): LearnerState {
  if (
    !record(backup) ||
    backup.app !== "CISO Journey" ||
    (backup.version !== 1 && backup.version !== 2)
  ) {
    throw new Error(
      "Unsupported backup. Choose a CISO Journey version 1 or 2 backup.",
    );
  }
  return validateState(backup.data);
}

/** Shared validation for imports, stored snapshots and migration. */
export function validateState(data: unknown): LearnerState {
  if (
    !record(data) ||
    !record(data.completed) ||
    !record(data.scores) ||
    !Array.isArray(data.journal) ||
    !Array.isArray(data.achievements)
  ) {
    throw new Error("Invalid backup data. Current progress has not changed.");
  }
  if (
    !Object.values(data.completed).every(
      (value) => typeof value === "boolean",
    ) ||
    !Object.values(data.scores).every(
      (value) =>
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 0 &&
        value <= 4,
    )
  ) {
    throw new Error(
      "Invalid task completion or competency score. Current progress has not changed.",
    );
  }
  if ("reviewProgress" in data) validateReviewProgress(data.reviewProgress);
  if ("scenarioResponses" in data) validateScenarioResponses(data.scenarioResponses);
  if ("questionAttempts" in data) validateQuestionAttempts(data.questionAttempts);
  if ("resourceProgress" in data) validateResourceProgress(data.resourceProgress);
  if ("readingProgress" in data) validateReadingProgress(data.readingProgress);
  const journal = history(data.journal, "journal");
  const achievements = history(data.achievements, "achievements");
  return {
    ...empty(),
    ...data,
    completed: data.completed as Record<string, boolean>,
    scores: { ...empty().scores, ...data.scores } as Record<string, number>,
    journal,
    achievements,
  };
}

export function createBackup(state: LearnerState): Backup {
  return {
    app: "CISO Journey",
    version: 2,
    exportedAt: new Date().toISOString(),
    data: state,
  };
}
