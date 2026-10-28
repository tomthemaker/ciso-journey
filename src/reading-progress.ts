import { contentKey } from './content.ts';
import type { ContentRef } from './content.ts';
import type { LearnerState } from './types.ts';

export interface ReadingProgress {
  schemaVersion: 1;
  entries: { contentRef: ContentRef; completed: boolean; [key: string]: unknown }[];
  [key: string]: unknown;
}
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
/** Validate before a migration, import or transaction; retain compatible extra JSON fields. */
export function validateReadingProgress(value: unknown): asserts value is ReadingProgress {
  if (!object(value) || value.schemaVersion !== 1 || !Array.isArray(value.entries))
    throw new Error('Invalid or unsupported reading progress. Current progress has not changed.');
  const seen = new Set<string>();
  for (const entry of value.entries) {
    if (!object(entry) || !object(entry.contentRef) || typeof entry.contentRef.id !== 'string' ||
      !/^[a-z][a-z0-9-]*$/.test(entry.contentRef.id) || !Number.isSafeInteger(entry.contentRef.version) ||
      Number(entry.contentRef.version) < 1 || typeof entry.completed !== 'boolean')
      throw new Error('Invalid reading progress entry. Current progress has not changed.');
    const key = contentKey(entry.contentRef as unknown as ContentRef);
    if (seen.has(key)) throw new Error('Invalid duplicate reading progress. Current progress has not changed.');
    seen.add(key);
  }
}
export function isRead(state: LearnerState | undefined, ref: ContentRef): boolean {
  return state?.readingProgress?.entries.some(entry => contentKey(entry.contentRef) === contentKey(ref) && entry.completed) ?? false;
}
/** Only explicit reading participation changes; no task, rating, recall or assessment writes. */
export function setRead(state: LearnerState, ref: ContentRef, completed: boolean): void {
  state.readingProgress ??= { schemaVersion: 1, entries: [] };
  const existing = state.readingProgress.entries.find(entry => contentKey(entry.contentRef) === contentKey(ref));
  if (existing) existing.completed = completed;
  else state.readingProgress.entries.push({ contentRef: { id: ref.id, version: ref.version }, completed });
}
