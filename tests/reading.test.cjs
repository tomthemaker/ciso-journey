const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const mixed = require('./fixtures/v1/mixed-progress.json');
let setRead, isRead, validateBackup, createBackup, contentRoute, safeHttps;
before(async () => {
  ({ setRead, isRead } = await import('../src/reading-progress.ts'));
  ({ validateBackup, createBackup } = await import('../src/backup.ts'));
  ({ contentRoute, safeHttps } = await import('../src/content.ts'));
});
const ref = { id: 'lesson-synthetic', version: 1 };
test('reading changes only exact revision participation and preserves legacy/opaque fields', () => {
  const state = structuredClone(mixed.data);
  const legacy = structuredClone(state);
  setRead(state, ref, true);
  assert.equal(isRead(state, ref), true);
  assert.equal(isRead(state, { ...ref, version: 2 }), false);
  const { readingProgress, ...rest } = state;
  assert.deepEqual(rest, legacy);
  readingProgress.syntheticExtension = { safe: '<script>text only</script>' };
  readingProgress.entries[0].syntheticEvidence = ['preserved'];
  for (const version of [1, 2]) assert.deepEqual(validateBackup({ ...createBackup(state), version }), state);
  setRead(state, ref, false);
  assert.equal(isRead(state, ref), false);
  assert.equal(state.readingProgress.entries.length, 1);
  assert.deepEqual(state.readingProgress.entries[0].syntheticEvidence, ['preserved']);
});
test('malformed/future/duplicate reading progress rejects the whole import without mutation', () => {
  const entries = [{ contentRef: ref, completed: true }];
  const bad = [null, [], {}, { schemaVersion: 2, entries }, { schemaVersion: 1, entries: {} },
    ...[null, { contentRef: ref }, { contentRef: { ...ref, version: 0 }, completed: true },
      { contentRef: { ...ref, version: '1' }, completed: true },
      { contentRef: { id: '<img onerror=1>', version: 1 }, completed: true },
      { contentRef: ref, completed: 'true' }].map(entry => ({ schemaVersion: 1, entries: [entry] })),
    { schemaVersion: 1, entries: [...entries, ...entries] }];
  for (const readingProgress of bad) {
    const backup = { ...mixed, version: 2, data: { ...mixed.data, readingProgress } };
    const original = structuredClone(backup);
    assert.throws(() => validateBackup(backup), /reading progress/);
    assert.deepEqual(backup, original);
  }
});
test('unknown historical refs survive backup and never become current revision progress', () => {
  const state = structuredClone(mixed.data);
  setRead(state, { id: 'lesson-no-longer-shipped', version: 12 }, true);
  assert.deepEqual(validateBackup(createBackup(state)), state);
  assert.equal(isRead(state, ref), false);
});
test('Pages content routes are pinned and external URLs require credential-free HTTPS', () => {
  assert.deepEqual(contentRoute('#lessons/lesson-synthetic/2'), { id: 'lesson-synthetic', version: 2 });
  for (const route of ['#lessons', '#lessons/a/0', '#lessons/a/2e3', '#lessons/%3Cimg%3E/1', '#lessons/a/9007199254740992']) assert.equal(contentRoute(route), undefined);
  assert.equal(safeHttps('https://www.nist.gov/example'), 'https://www.nist.gov/example');
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'http://www.nist.gov', 'https://user:pass@nist.gov', '//nist.gov', '<img>']) assert.equal(safeHttps(url), undefined);
});
