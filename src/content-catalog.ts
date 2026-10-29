import { contentKey } from './content.ts';
import type { ContentBundle, ContentRecord } from './content.ts';
import { phases } from './data.ts';

/** Composition never edits authored revisions, actors or editorial provenance. */
export function composeContent(contentVersion: string, bundles: ContentBundle[]): ContentBundle {
  const baseline = bundles[0];
  const actors = new Map<string, ContentBundle['actors'][number]>();
  const revisions = new Set<string>();
  for (const bundle of bundles) {
    if (bundle.schemaVersion !== baseline.schemaVersion || bundle.curriculumVersion !== baseline.curriculumVersion)
      throw new Error('Content bundles must share their schema and curriculum version.');
    for (const actor of bundle.actors) {
      const prior = actors.get(actor.id);
      if (prior && JSON.stringify(prior) !== JSON.stringify(actor)) throw new Error(`Conflicting actor: ${actor.id}`);
      actors.set(actor.id, actor);
    }
    for (const record of bundle.records) {
      if (revisions.has(contentKey(record))) throw new Error(`Duplicate content revision: ${contentKey(record)}`);
      revisions.add(contentKey(record));
    }
  }
  return { schemaVersion: baseline.schemaVersion, contentVersion, curriculumVersion: baseline.curriculumVersion,
    actors: [...actors.values()], records: bundles.flatMap(bundle => bundle.records), editorial: bundles.flatMap(bundle => bundle.editorial) };
}

const taskOrder = phases.flatMap(phase => phase.tasks.map(([id]) => id));
const order = (record: ContentRecord): number => Math.min(...record.taskIds.map(id => taskOrder.indexOf(id)).filter(index => index >= 0), taskOrder.length);
/** Current catalogs follow the actual roadmap, preserving authored exact refs in history and practice. */
export function latestRecords(bundle: ContentBundle, kind: string): ContentRecord[] {
  return bundle.records.filter(record => record.kind === kind && !bundle.records.some(other => other.id === record.id && other.version > record.version))
    .sort((a, b) => order(a) - order(b));
}
export const taskContent = (bundle: ContentBundle, taskId: string, kind: string): ContentRecord[] =>
  latestRecords(bundle, kind).filter(record => record.taskIds.includes(taskId));

export const cardHash = (ref: { id: string; version: number }): string => `#today/card/${encodeURIComponent(ref.id)}/${ref.version}`;
export function cardRoute(hash: string): { id: string; version: number } | undefined {
  const match = /^#today\/card\/([a-z][a-z0-9-]*)\/([1-9]\d*)$/.exec(hash);
  return match && Number.isSafeInteger(Number(match[2])) ? { id: match[1], version: Number(match[2]) } : undefined;
}
