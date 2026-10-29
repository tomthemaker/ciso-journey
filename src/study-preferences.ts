import type { ContentRef } from './content.ts';
import { phases } from './data.ts';
import type { LearnerState } from './types.ts';

export interface StudyPreferences {
  schemaVersion: 1;
  dailyMinutes: number;
  goalTaskIds: string[];
  overrideRef?: ContentRef;
  updatedAt: string;
  [key: string]: unknown;
}
export const studyTaskIds = phases.flatMap(phase => phase.tasks.map(([id]) => id));
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
export function validateStudyPreferences(value: unknown): asserts value is StudyPreferences {
  if (!object(value) || value.schemaVersion !== 1 || !Number.isSafeInteger(value.dailyMinutes) || Number(value.dailyMinutes) < 1 || Number(value.dailyMinutes) > 480 ||
    !Array.isArray(value.goalTaskIds) || !value.goalTaskIds.every(id => typeof id === 'string' && studyTaskIds.includes(id)) || new Set(value.goalTaskIds).size !== value.goalTaskIds.length ||
    typeof value.updatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.updatedAt) || !Number.isFinite(Date.parse(value.updatedAt)) || new Date(value.updatedAt).toISOString() !== value.updatedAt ||
    ('overrideRef' in value && (!object(value.overrideRef) || typeof value.overrideRef.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(value.overrideRef.id) || !Number.isSafeInteger(value.overrideRef.version) || Number(value.overrideRef.version) < 1)))
    throw new Error('Invalid or unsupported study preferences. Current progress has not changed.');
}
export function saveStudyPreferences(state: LearnerState, preferences: StudyPreferences): void {
  validateStudyPreferences(preferences);
  const candidate = { ...structuredClone(state.studyPreferences ?? {}), ...structuredClone(preferences) };
  if (!('overrideRef' in preferences)) delete candidate.overrideRef;
  validateStudyPreferences(candidate);
  state.studyPreferences = candidate;
}
