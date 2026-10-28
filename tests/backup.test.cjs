const { test, before } = require('node:test');
const assert = require('node:assert/strict');
let validateBackup, defaults, data;
before(async () => {
  ({ validateBackup } = await import('../src/backup.ts'));
  ({ empty: defaults } = await import('../src/storage.ts'));
  data = await import('../src/data.ts');
});
const inventory = require('./fixtures/v1/inventory.json');
const empty = require('./fixtures/v1/empty.json');
const mixed = require('./fixtures/v1/mixed-progress.json');
const allComplete = require('./fixtures/v1/all-complete.json');
const { malformedInputs, invalidDates, validDates } = require('./fixtures/backup-cases.cjs');

// These expectations are frozen synthetic evidence, independent of runtime data.
test('shipped inventory preserves all 37 task meanings, resource destinations and six defaults', () => {
  assert.deepEqual(data.phases, inventory.phases);
  assert.deepEqual(data.taskLearningResources, inventory.taskLearningResources);
  assert.deepEqual(data.competencies, inventory.competencies);
  assert.deepEqual(data.resources, inventory.resources);
  const ids = data.phases.flatMap(phase => phase.tasks.map(([id]) => id));
  assert.equal(ids.length, 37);
  assert.equal(new Set(ids).size, 37);
  assert.deepEqual(ids.slice(0, 12), Array.from({ length: 12 }, (_, i) => `w${i + 1}`));
  assert.deepEqual(defaults(), empty.data);
});

for (const [name, backup] of Object.entries({ empty, mixed, allComplete })) {
  test(`v1 ${name}: validation preserves every value without mutating input`, () => {
    const original = structuredClone(backup);
    const candidate = validateBackup(backup);
    assert.deepEqual(candidate, backup.data);
    assert.deepEqual(backup, original);
    assert.deepEqual(validateBackup(JSON.parse(JSON.stringify({ ...backup, data: candidate }))), candidate);
  });
}

test('partial legacy scores receive defaults and extra JSON fields remain intact', () => {
  const backup = structuredClone(mixed);
  backup.data.scores = { Governance: 4 };
  backup.data.syntheticExtension = { label: 'Synthetic extension only' };
  const original = structuredClone(backup);
  assert.deepEqual(validateBackup(backup), { ...backup.data, scores: { ...empty.data.scores, Governance: 4 } });
  assert.deepEqual(backup, original);
});

for (const [label, input] of malformedInputs) {
  test(`reject ${label} without mutating the payload`, () => {
    if (label === 'truncated JSON') {
      assert.throws(() => JSON.parse(input), SyntaxError);
      return;
    }
    const payload = JSON.parse(input);
    const original = structuredClone(payload);
    assert.throws(() => validateBackup(payload), /Unsupported backup|Invalid /);
    assert.deepEqual(payload, original);
  });
}

for (const kind of ['journal', 'achievements']) {
  for (const date of invalidDates) {
    test(`reject ${kind} impossible date ${date} without mutating the payload`, () => {
      const payload = structuredClone(allComplete);
      payload.data[kind][0].date = date;
      const original = structuredClone(payload);
      assert.throws(() => validateBackup(payload), new RegExp('Invalid ' + kind + ' entry'));
      assert.deepEqual(payload, original);
    });
  }
  for (const date of validDates) {
    test(`preserve ${kind} valid legacy date ${date}`, () => {
      const payload = structuredClone(allComplete);
      payload.data[kind][0].date = date;
      assert.deepEqual(validateBackup(payload), payload.data);
    });
  }
}

test('display preference is optional, round-trips and rejects invalid or future values', () => {
  const backup = structuredClone(mixed);
  assert.equal(validateBackup(backup).displayPreferences, undefined);
  for (const theme of ['system', 'light', 'dark']) {
    backup.data.displayPreferences = { schema: 1, theme };
    assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(backup))).displayPreferences, { schema: 1, theme });
  }
  for (const bad of [null, {}, { schema: 2, theme: 'dark' }, { schema: 1, theme: 'future' }, { schema: 1, theme: null }]) {
    backup.data.displayPreferences = bad;
    assert.throws(() => validateBackup(backup), /Invalid display preferences/);
  }
});
