import { safeHttps } from './content.ts';
import { phases } from './data.ts';
import type { LearnerState } from './types.ts';

export type ResourceStatus = 'not-started' | 'in-progress' | 'completed';
export interface ResourceDefinition {
  id: string;
  taskId: string;
  isCustom: boolean;
  title: string;
  platform: string;
  url: string;
  type: 'course' | 'reference';
}
export interface ResourceRevision {
  version: number;
  title: string;
  platform: string;
  url: string;
  type: 'course' | 'reference';
  archived: boolean;
  changedAt: string;
  [key: string]: unknown;
}
export interface ResourceEntry {
  id: string;
  taskId: string;
  isCustom: boolean;
  revisions: ResourceRevision[];
  progress: {
    resourceVersion: number;
    status: ResourceStatus;
    completedAt: string | null;
    notes: string;
    evidenceUrl: string;
    recordedAt: string;
    [key: string]: unknown;
  }[];
  [key: string]: unknown;
}
export interface ResourceProgress {
  schemaVersion: 1;
  entries: ResourceEntry[];
  [key: string]: unknown;
}
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const tasks = new Set(phases.flatMap(phase => phase.tasks.map(task => task[0])));
const timestamp = (value: unknown): boolean => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
export const resourceDate = (value: unknown): boolean => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const status = (value: unknown): value is ResourceStatus => typeof value === 'string' && ['not-started', 'in-progress', 'completed'].includes(value);
const metadata = (value: Record<string, unknown>): boolean => typeof value.title === 'string' && value.title.trim().length > 0 && typeof value.platform === 'string' && value.platform.trim().length > 0 && !!safeHttps(value.url) && (value.type === 'course' || value.type === 'reference');
function invalid(): never { throw new Error('Invalid or unsupported resource progress. Current progress has not changed.'); }
/** Entire namespace is checked before persistence; historical and compatible extra fields survive. */
export function validateResourceProgress(value: unknown): asserts value is ResourceProgress {
  if (!object(value) || value.schemaVersion !== 1 || !Array.isArray(value.entries)) invalid();
  const ids = new Set<string>();
  for (const entry of value.entries) {
    if (!object(entry) || typeof entry.id !== 'string' || !/^[a-z][a-z0-9-]{0,100}$/.test(entry.id) || ids.has(entry.id) || typeof entry.taskId !== 'string' || !tasks.has(entry.taskId) || typeof entry.isCustom !== 'boolean' || !Array.isArray(entry.revisions) || entry.revisions.length === 0 || !Array.isArray(entry.progress)) invalid();
    if (entry.isCustom ? !entry.id.startsWith('custom-') : !entry.id.startsWith(entry.taskId + '-')) invalid();
    ids.add(entry.id);
    for (const [index, revision] of entry.revisions.entries()) {
      if (!object(revision) || revision.version !== index + 1 || !metadata(revision) || typeof revision.archived !== 'boolean' || !timestamp(revision.changedAt)) invalid();
    }
    for (const event of entry.progress) {
      if (!object(event) || !Number.isSafeInteger(event.resourceVersion) || Number(event.resourceVersion) < 1 || Number(event.resourceVersion) > entry.revisions.length || !status(event.status) || typeof event.notes !== 'string' || typeof event.evidenceUrl !== 'string' || (event.evidenceUrl !== '' && !safeHttps(event.evidenceUrl)) || !timestamp(event.recordedAt) || (event.status === 'completed' ? !resourceDate(event.completedAt) : event.completedAt !== null)) invalid();
    }
  }
}
export const latestResource = (entry: ResourceEntry): ResourceRevision => entry.revisions[entry.revisions.length - 1];
export const latestProgress = (entry: ResourceEntry | undefined) => entry?.progress[entry.progress.length - 1];
export function trackedResource(state: LearnerState, resource: ResourceDefinition): ResourceEntry {
  state.resourceProgress ??= { schemaVersion: 1, entries: [] };
  let entry = state.resourceProgress.entries.find(entry => entry.id === resource.id);
  if (!entry) {
    entry = { id: resource.id, taskId: resource.taskId, isCustom: resource.isCustom, revisions: [{ version: 1, title: resource.title, platform: resource.platform, url: resource.url, type: resource.type, archived: false, changedAt: new Date().toISOString() }], progress: [] };
    state.resourceProgress.entries.push(entry);
  }
  return entry;
}
/** No sibling task, reading, recall, question, assessment or score writes. */
export function saveResourceProgress(state: LearnerState, resource: ResourceDefinition, values: { status: ResourceStatus; completedAt: string | null; notes: string; evidenceUrl: string }): void {
  const entry = trackedResource(state, resource);
  entry.progress.push({ ...values, resourceVersion: latestResource(entry).version, recordedAt: new Date().toISOString() });
}
export function editResource(state: LearnerState, resource: ResourceDefinition, values: Pick<ResourceRevision, 'title' | 'platform' | 'url' | 'type' | 'archived'>): void {
  const entry = trackedResource(state, resource);
  entry.revisions.push({ ...latestResource(entry), ...values, version: entry.revisions.length + 1, changedAt: new Date().toISOString() });
}
export function resourceCompletionCount(state: LearnerState): number {
  return state.resourceProgress?.entries.filter(entry => latestProgress(entry)?.status === 'completed').length ?? 0;
}
