const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mixed = require('./fixtures/v1/mixed-progress.json');
const { malformedInputs } = require('./fixtures/backup-cases.cjs');
let createBackup, validateBackup, LearnerStorage;
const originalFetch = global.fetch;
before(async () => {
  ({ createBackup, validateBackup } = await import('../src/backup.ts'));
  ({ LearnerStorage } = await import('../src/storage.ts'));
});
after(() => { global.fetch = originalFetch; });
test('v2 full backup preserves all entities and opaque extensions', () => {
  const data = structuredClone(mixed.data);
  data.syntheticExtension = { nested: [null, false, 42] };
  assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(createBackup(data)))), data);
});
test('v2 rejects malformed backups', () => {
  for (const [label, text] of malformedInputs) {
    if (['truncated JSON', 'future version', 'string version', 'null envelope', 'array envelope'].includes(label)) continue;
    const backup = JSON.parse(text); backup.version = 2;
    assert.throws(() => validateBackup(backup), /Unsupported|Invalid/, label);
  }
});
test('server saves use captured identity and revision; uncertain outcomes require reload', async () => {
  const owner = 'synthetic-user'; let revision = 'revision-1'; let data = mixed.data; let fail = false; let invalidated = false;
  const requests = [];
  global.fetch = async (url, options) => {
    const args = JSON.parse(options.body); requests.push({ url, options, args });
    if (fail) return new Response(JSON.stringify({ message: 'account_revision_stale' }), { status: 409 });
    if (url.endsWith('account_save')) { assert.equal(args.p_expected_revision, revision); data = args.p_snapshot.data; revision = 'revision-2'; }
    return Response.json({ protocol: 1, owner, revision, snapshot: { schemaVersion: 2, data } });
  };
  const store = new LearnerStorage({ project: 'https://example.test', key: 'public', token: 'captured-token', subject: owner, invalidate: () => { invalidated = true; } });
  assert.deepEqual(await store.load(), data);
  await store.save(data);
  assert.equal(requests[1].options.headers.Authorization, 'Bearer captured-token');
  fail = true; await assert.rejects(store.save(data), /Progress changed elsewhere/);
  await assert.rejects(store.save(data), /Reload progress/);
  assert.equal(requests.length, 3);
  fail = false; await store.load(); await store.save(data);
  assert.equal(invalidated, false);
});
test('wrong account responses and invalid server snapshots never load', async () => {
  global.fetch = async () => Response.json({ protocol: 1, owner: 'other', revision: 'r', snapshot: { schemaVersion: 2, data: mixed.data } });
  const store = new LearnerStorage({ project: 'https://example.test', key: 'public', token: 'token', subject: 'user', invalidate() {} });
  await assert.rejects(store.load(), /could not be verified/);
});
