const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const mixed = require('./fixtures/v1/mixed-progress.json');
let saveResourceProgress, trackedResource, editResource, latestResource, latestProgress, resourceCompletionCount, validateBackup, createBackup, taskResources;
before(async () => {
  ({ saveResourceProgress, trackedResource, editResource, latestResource, latestProgress, resourceCompletionCount } = await import('../src/resource-progress.ts'));
  ({ validateBackup, createBackup } = await import('../src/backup.ts'));
  ({ taskResources } = await import('../src/resource-catalog.ts'));
});
const resource = { id: 'custom-synthetic', taskId: 'w1', isCustom: true, title: 'Synthetic course', platform: 'Synthetic publisher', url: 'https://example.org/original', type: 'course' };
const values = { status: 'completed', completedAt: '2024-02-29', notes: '<img src=x onerror=1> literal notes', evidenceUrl: 'https://example.org/evidence' };
function state() {
  return { ...structuredClone(mixed.data), readingProgress: { schemaVersion: 1, entries: [{ contentRef: { id: 'lesson-synthetic', version: 1 }, completed: true }] }, recallSynthetic: { due: ['untouched'] }, taskMastery: { w1: 'not-assessed' }, questionAttemptsSynthetic: [1] };
}
test('resource completion, edits and archive/restore change no other learner state; v1/v2 round-trip retains all history', () => {
  const candidate = state(), original = structuredClone(candidate);
  saveResourceProgress(candidate, resource, values);
  const entry = candidate.resourceProgress.entries[0];
  entry.syntheticExtra = { preserved: true };
  entry.progress[0].syntheticExtra = 3;
  const first = structuredClone(entry.progress[0]);
  const updated = { title: 'Renamed course', platform: 'New publisher', url: 'https://example.org/replacement', type: 'course', archived: false };
  editResource(candidate, resource, updated);
  editResource(candidate, resource, { ...updated, archived: true });
  assert.equal(resourceCompletionCount(candidate), 1);
  assert.deepEqual(entry.progress[0], first);
  assert.equal(entry.progress[0].resourceVersion, 1);
  assert.equal(entry.revisions[0].url, resource.url);
  assert.equal(latestResource(entry).archived, true);
  editResource(candidate, resource, updated);
  saveResourceProgress(candidate, resource, { ...values, status: 'in-progress', completedAt: null });
  assert.equal(resourceCompletionCount(candidate), 0);
  assert.equal(latestProgress(entry).resourceVersion, 4);
  assert.equal(entry.revisions.length, 4);
  assert.equal(entry.progress.length, 2);
  const { resourceProgress, ...siblings } = candidate;
  assert.deepEqual(siblings, original);
  for (const version of [1, 2]) assert.deepEqual(validateBackup({ ...createBackup(candidate), version }), candidate);
});
test('catalog identity ignores URL/title edits and discovery searches are not trackable records', () => {
  const first = taskResources('w1');
  assert.deepEqual(first.map(resource => resource.id), ['w1-linkedin', 'w1-official']);
  assert.ok(first.every(resource => !resource.url.includes('/search')));
  const candidate = state();
  saveResourceProgress(candidate, first[0], values);
  trackedResource(candidate, { ...first[0], title: 'Changed catalog title', url: 'https://example.org/new-catalog-url' });
  assert.equal(candidate.resourceProgress.entries.length, 1);
  assert.equal(candidate.resourceProgress.entries[0].revisions[0].url, first[0].url);
  assert.equal(resourceCompletionCount(candidate), 1);
});
test('corrupt/future resource state, unsafe URLs and impossible dates reject complete backups without mutation', () => {
  const valid = state();
  saveResourceProgress(valid, resource, values);
  const variants = [
    progress => { progress.schemaVersion = 99; },
    progress => { progress.entries.push(structuredClone(progress.entries[0])); },
    progress => { progress.entries[0].taskId = 'invented'; },
    progress => { progress.entries[0].revisions = []; },
    progress => { progress.entries[0].revisions[0].version = 2; },
    progress => { progress.entries[0].revisions[0].archived = 'true'; },
    progress => { progress.entries[0].progress[0].resourceVersion = 2; },
    progress => { progress.entries[0].progress[0].status = ['completed']; },
    progress => { progress.entries[0].progress[0].completedAt = '2025-02-29'; },
    progress => { progress.entries[0].progress[0].completedAt = '2024-02-30'; },
    progress => { progress.entries[0].progress[0].recordedAt = '2024-02-30T00:00:00.000Z'; },
    progress => { progress.entries[0].progress[0].notes = null; },
    ...['javascript:alert(1)', 'data:text/html,unsafe', 'http://example.org', 'https://user:pass@example.org', '//example.org', '<img>'].flatMap(url => [
      progress => { progress.entries[0].revisions[0].url = url; },
      progress => { progress.entries[0].progress[0].evidenceUrl = url; }
    ])
  ];
  for (const mutate of variants) {
    const backup = structuredClone(createBackup(valid)); mutate(backup.data.resourceProgress);
    const original = structuredClone(backup);
    assert.throws(() => validateBackup(backup), /resource progress/);
    assert.deepEqual(backup, original);
  }
  for (const resourceProgress of [null, [], {}, { schemaVersion: 1, entries: {} }]) assert.throws(() => validateBackup({ ...mixed, data: { ...mixed.data, resourceProgress } }), /resource progress/);
});
