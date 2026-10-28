/** C02 revision references stay pinned; displaying a newer revision never retargets progress. */
export interface ContentRef { id: string; version: number }
export type PublicationStatus = 'draft' | 'source-checked' | 'independently-reviewed' | 'published' | 'stale' | 'retired';
export interface ContentPayload {
  conceptRefs?: ContentRef[];
  practiceRefs?: ContentRef[];
  prerequisiteRefs?: ContentRef[];
  conceptRef?: ContentRef;
  rubricRef?: ContentRef;
  reviewDueAt?: string;
  validFrom?: string | null;
  validUntilExclusive?: string | null;
  [key: string]: unknown;
}
export interface ContentRecord extends ContentRef {
  kind: string;
  title: string;
  taskIds: string[];
  objectiveIds: string[];
  authorIds: string[];
  authoredAt: string;
  sourceRefs: ContentRef[];
  payload: ContentPayload;
}
export interface Lesson extends ContentRecord {
  payload: ContentPayload & {
    sections: { heading: string; body: string }[];
    prerequisiteRefs: ContentRef[];
    estimatedMinutes: number;
    workedExample: string;
    misconceptions: string[];
    conceptRefs: ContentRef[];
    practiceRefs: ContentRef[];
  };
}
export interface ContentBundle {
  schemaVersion: number;
  contentVersion: string;
  curriculumVersion: string;
  actors: { id: string; kind: string; role: string }[];
  records: ContentRecord[];
  editorial: {
    ref: ContentRef;
    status: PublicationStatus;
    reviews: { reviewerId: string; role: string; date: string; evidence: string; verdict: string }[];
    unresolvedChallenges: string[];
  }[];
}
export const contentKey = (ref: ContentRef): string => `${ref.id}@${ref.version}`;
export const findContent = (bundle: ContentBundle, ref: ContentRef): ContentRecord | undefined =>
  bundle.records.find(record => contentKey(record) === contentKey(ref));
export const contentHash = (ref: ContentRef): string => `#lessons/${encodeURIComponent(ref.id)}/${ref.version}`;
export function contentRoute(hash: string): ContentRef | undefined {
  const match = /^#lessons\/([a-z][a-z0-9-]*)\/([1-9]\d*)$/.exec(hash);
  if (!match || !Number.isSafeInteger(Number(match[2]))) return undefined;
  return { id: match[1], version: Number(match[2]) };
}
export function safeHttps(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}
