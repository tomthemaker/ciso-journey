import { contentKey, findContent } from './content.ts';
import type { ContentBundle, ContentRecord, ContentRef, PublicationStatus } from './content.ts';

/** Shared by C02 validation and the reader: one publication/expiry policy. */
export function contentRefs(record: ContentRecord): ContentRef[] {
  const p = record.payload;
  return [...record.sourceRefs, ...(p.conceptRefs ?? []), ...(p.practiceRefs ?? []),
    ...(p.prerequisiteRefs ?? []), ...(p.conceptRef ? [p.conceptRef] : []), ...(p.rubricRef ? [p.rubricRef] : [])];
}
function sourceEvidenceStale(bundle: ContentBundle, record: ContentRecord | undefined, asOf: string): boolean {
  if (record?.kind !== 'source') return false;
  const state = bundle.editorial.find(item => contentKey(item.ref) === contentKey(record));
  return (record.payload.reviewDueAt ?? '') <= asOf || !!state?.unresolvedChallenges.length ||
    !!state?.reviews.some(review => review.verdict === 'changes-requested');
}
export function effectiveStatus(
  bundle: ContentBundle, record: ContentRecord | undefined, asOf: string,
  _curriculum?: unknown, visited = new Set<string>(),
): PublicationStatus {
  if (!record || !record.payload || typeof record.payload !== 'object') return 'stale';
  const state = bundle.editorial.find(item => contentKey(item.ref) === contentKey(record))?.status ?? 'stale';
  if (['draft', 'stale', 'retired'].includes(state) || visited.has(contentKey(record))) return state;
  visited.add(contentKey(record));
  const p = record.payload;
  if (sourceEvidenceStale(bundle, record, asOf) || (record.kind === 'mapping' &&
    ((p.validUntilExclusive && p.validUntilExclusive <= asOf) || (p.validFrom && p.validFrom > asOf)))) return 'stale';
  for (const ref of contentRefs(record)) {
    const dependent = findContent(bundle, ref);
    if (sourceEvidenceStale(bundle, dependent, asOf) ||
      ['stale', 'retired'].includes(effectiveStatus(bundle, dependent, asOf, _curriculum, visited))) return 'stale';
  }
  return state;
}
