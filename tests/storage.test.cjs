const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const mixed = require('./fixtures/v1/mixed-progress.json');
const { malformedInputs } = require('./fixtures/backup-cases.cjs');
let createBackup, validateBackup, validateSnapshot, recoveryMessage, LearnerStorage;
before(async () => {
  ({ createBackup, validateBackup } = await import('../src/backup.ts'));
  ({ validateSnapshot, recoveryMessage, LearnerStorage } = await import('../src/storage.ts'));
});

test('v2 full backup round-trips all current entities and opaque extensions without coercion', () => {
  const data = structuredClone(mixed.data);
  data.syntheticExtension = { contentVersion: 'synthetic-v1', nested: [null, false, 42, '<text>'] };
  data.journal[0].syntheticMetadata = { reviewed: false };
  data.completed.syntheticFutureTask = false;
  data.scores.syntheticFutureRating = 3;
  const backup = createBackup(data);
  assert.equal(backup.version, 2);
  assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(backup))), data);
  assert.deepEqual(validateSnapshot({ schemaVersion: 2, revision: 7, data }).data, data);
});

test('v2 applies the complete corrupt-data rejection matrix', () => {
  for (const [label, text] of malformedInputs) {
    if (['truncated JSON', 'future version', 'string version', 'null envelope', 'array envelope'].includes(label)) continue;
    const backup = JSON.parse(text);
    backup.version = 2;
    assert.throws(() => validateBackup(backup), /Unsupported|Invalid/, label);
  }
  assert.throws(() => validateBackup({ ...mixed, version: 3 }), /Unsupported/);
});

test('stored corrupt/future snapshots reject rather than returning defaults', () => {
  for (const value of [null, {}, { schemaVersion: 3, revision: 1, data: mixed.data },
    { schemaVersion: 2, revision: 0, data: mixed.data }, { schemaVersion: 2, revision: 1.5, data: mixed.data },
    { schemaVersion: 2, revision: 1, data: { ...mixed.data, scores: { Governance: 9 } } }]) {
    assert.throws(() => validateSnapshot(value));
  }
});

test('unavailable IndexedDB rejects and retains exact legacy recovery bytes', async () => {
  const raw = JSON.stringify(mixed.data, null, 2);
  const storage = new LearnerStorage(undefined, { getItem: () => raw });
  await assert.rejects(storage.load(), /IndexedDB storage is unavailable/);
  assert.equal(storage.recovery, raw);
  const message = recoveryMessage(new DOMException('Synthetic quota', 'QuotaExceededError'));
  assert.match(message, /Synthetic quota/);
  assert.match(message, /No progress was replaced/);
  assert.match(message, /Do not clear site data/);
});
