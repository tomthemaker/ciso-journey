const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const mixed = require('./fixtures/v1/mixed-progress.json');
let reviews, validateBackup, createBackup;
before(async () => {
  reviews = await import('../src/reviews.ts');
  ({ validateBackup, createBackup } = await import('../src/backup.ts'));
});
const now = '2026-10-28T08:00:00.000Z';
const ref = { id: 'card-synthetic', version: 1 };
function state() { const s = structuredClone(mixed.data); reviews.enrollCard(s, ref, now); return s; }
function input(rating = 'Good', eventId = 'synthetic-event', extra = {}) { return { eventId, contentRef: ref, rating, now, timeZone: 'Europe/Zurich', ...extra }; }
for (const rating of ['Again', 'Hard', 'Good', 'Easy']) test(`${rating}: deterministic complete FSRS state/log/provenance and no task/competency effects`, () => {
  const s = state(), legacy = structuredClone(s);
  const event = reviews.applyReview(s, input(rating));
  assert.equal(event.rating, rating);
  assert.equal(event.after.reps, 1);
  assert.equal(event.after.last_review, now);
  const expectedDue = { Again: '2026-10-28T08:01:00.000Z', Hard: '2026-10-28T08:06:00.000Z', Good: '2026-10-28T08:10:00.000Z', Easy: '2026-11-05T08:00:00.000Z' };
  assert.equal(event.after.due, expectedDue[rating]);
  assert.deepEqual(event.provenance.parameters.request_retention, 0.9);
  assert.equal(event.provenance.parameters.enable_fuzz, false);
  assert.equal(event.provenance.libraryVersion, require('../node_modules/ts-fsrs/package.json').version);
  assert.equal(event.provenance.schedulerVersion, 'FSRS-6.0');
  assert.equal(event.provenance.parameters.w.length, 21);
  assert.deepEqual(s.reviewProgress.cards[0].schedule, event.after);
  for (const key of Object.keys(legacy).filter(k => k !== 'reviewProgress')) assert.deepEqual(s[key], legacy[key]);
  const copy = state();
  assert.deepEqual(reviews.applyReview(copy, input(rating)), event);
  event.after.reps = 100; // returned values cannot mutate the immutable stored event
  assert.equal(s.reviewProgress.events[0].after.reps, 1);
  assert.deepEqual(validateBackup(createBackup(s)), s);
});
test('rating meanings distinguish failed recall and effortful success', () => {
  assert.equal(reviews.ratingMeaning.Again, 'Failed recall');
  assert.equal(reviews.ratingMeaning.Hard, 'Successful recall with effort');
});
test('new-card caps count introductions once per local day; overdue reviews always carry over', () => {
  const s = state();
  for (const id of ['card-zb', 'card-zc']) reviews.enrollCard(s, { id, version: 1 }, now);
  reviews.setNewCardLimit(s, 1);
  assert.equal(reviews.dueQueue(s, now, 'Europe/Zurich').newCards.length, 1);
  reviews.applyReview(s, input('Again'));
  assert.equal(reviews.dueQueue(s, now, 'Europe/Zurich').remainingNew, 0);
  assert.throws(() => reviews.applyReview(s, input('Easy', 'another', { contentRef: { id: 'card-zb', version: 1 } })), /limit/);
  const later = '2026-11-10T00:00:00.000Z';
  reviews.setNewCardLimit(s, 0);
  assert.equal(reviews.dueQueue(s, later, 'Europe/Zurich').due.length, 1);
  assert.equal(reviews.dueQueue(s, later, 'Europe/Zurich').newCards.length, 0);
  const previous = structuredClone(s.reviewProgress.events[0]);
  const overdue = reviews.applyReview(s, input('Hard', 'overdue', { now: later }));
  assert.equal(overdue.after.reps, 2);
  assert.ok(overdue.log.elapsed_days >= 12);
  assert.deepEqual(s.reviewProgress.events[0], previous);
  assert.deepEqual(validateBackup(createBackup(s)), s);
});
test('timezone boundaries reset daily cap at local midnight, including DST and west-of-UTC dates', () => {
  const s = state();
  const first = '2026-10-28T22:59:59.000Z', midnight = '2026-10-28T23:00:00.000Z';
  reviews.setNewCardLimit(s, 1);
  reviews.applyReview(s, input('Good', 'boundary', { now: first }));
  assert.equal(reviews.localDay(first, 'Europe/Zurich'), '2026-10-28');
  assert.equal(reviews.localDay(midnight, 'Europe/Zurich'), '2026-10-29');
  assert.equal(reviews.dueQueue(s, first, 'Europe/Zurich').remainingNew, 0);
  assert.equal(reviews.dueQueue(s, midnight, 'Europe/Zurich').remainingNew, 1);
  assert.equal(reviews.localDay('2026-03-29T21:59:59.000Z', 'Europe/Zurich'), '2026-03-29');
  assert.equal(reviews.localDay('2026-03-29T22:00:00.000Z', 'Europe/Zurich'), '2026-03-30');
  assert.equal(reviews.localDay('2026-10-28T00:00:00.000Z', 'America/Los_Angeles'), '2026-10-27');
  assert.throws(() => reviews.dueQueue(s, first, 'invalid-zone'), /time zone/i);
});
test('duplicate submission IDs are idempotent across refresh; conflicting reuse and early distinct IDs reject', () => {
  const s = state(), first = reviews.applyReview(s, input());
  const restored = validateBackup(JSON.parse(JSON.stringify(createBackup(s))));
  assert.deepEqual(reviews.applyReview(restored, input('Good', 'synthetic-event', { now: '2026-10-30T08:00:00.000Z' })), first);
  assert.equal(restored.reviewProgress.events.length, 1);
  assert.throws(() => reviews.applyReview(restored, input('Easy')), /already used/);
  assert.throws(() => reviews.applyReview(restored, input('Good', 'second')), /not due/);
  assert.equal(restored.reviewProgress.events.length, 1);
});
test('suspend, archive and corrected content retain old events/schedules and use separate revisions', () => {
  const s = state(); reviews.applyReview(s, input());
  const first = structuredClone(s.reviewProgress.events[0]);
  for (const status of ['suspended', 'archived']) {
    reviews.setCardStatus(s, ref, status);
    assert.equal(reviews.dueQueue(s, '2026-12-01T00:00:00.000Z').due.length, 0);
    assert.deepEqual(s.reviewProgress.events[0], first);
  }
  reviews.enrollCard(s, { ...ref, version: 2 }, now);
  assert.equal(s.reviewProgress.cards.length, 2);
  assert.equal(s.reviewProgress.cards[1].schedule.reps, 0);
  assert.equal(s.reviewProgress.cards[0].schedule.reps, 1);
  assert.deepEqual(validateBackup(createBackup(s)), s);
  reviews.setCardStatus(s, ref, 'active');
  assert.equal(reviews.dueQueue(s, '2026-12-01T00:00:00.000Z').due.length, 1);
});
test('backup roundtrip preserves complete review, reading, original 37 IDs/scores and opaque compatible extensions', () => {
  const s = state(); reviews.applyReview(s, input());
  s.readingProgress = { schemaVersion: 1, entries: [{ contentRef: { id: 'lesson-synthetic', version: 3 }, completed: true }] };
  s.syntheticOtherFeature = { saved: ['<script>text</script>'] };
  s.reviewProgress.syntheticExtension = { retained: true };
  s.reviewProgress.events[0].syntheticExtension = ['keep'];
  s.reviewProgress.events[0].provenance.parameters.syntheticExtension = 'keep';
  s.reviewProgress.events[0].after.syntheticExtension = ['keep'];
  s.reviewProgress.cards[0].schedule.syntheticExtension = '<b>text</b>';
  for (const version of [1, 2]) assert.deepEqual(validateBackup(JSON.parse(JSON.stringify({ ...createBackup(s), version }))), s);
  assert.deepEqual(s.completed, mixed.data.completed);
  assert.deepEqual(s.scores, mixed.data.scores);
  assert.deepEqual(validateBackup(mixed), mixed.data);
});
test('malformed, future, orphan, duplicate and inconsistent histories reject whole backup safely', () => {
  const s = state(); reviews.applyReview(s, input());
  const mutations = [
    p => { p.schemaVersion = 99; }, p => { p.settings.newCardsPerDay = -1; },
    p => { p.cards[0].schedule.due = '2026-02-30T00:00:00.000Z'; },
    p => { p.cards[0].schedule.reps = 9; }, p => { p.cards.push(structuredClone(p.cards[0])); },
    p => { p.events.push(structuredClone(p.events[0])); }, p => { p.events[0].rating = 'Manual'; },
    p => { p.events[0].contentRef.version = 42; }, p => { p.events[0].before.lapses = -1; },
    p => { p.events[0].after.stability += 1; }, p => { p.events[0].log.rating = 1; },
    p => { p.events[0].provenance.libraryVersion = 'future'; },
    p => { p.events[0].provenance.parameters.w[0] = 900; }, p => { p.events[0].timeZone = 'invalid'; },
    p => { p.events = []; }, p => { p.events[0].after = {}; }, p => { p.cards[0].status = 'unknown'; },
  ];
  for (const mutate of mutations) {
    const backup = createBackup(structuredClone(s)); mutate(backup.data.reviewProgress);
    const untouched = structuredClone(backup);
    assert.throws(() => validateBackup(backup), /review progress/);
    assert.deepEqual(backup, untouched); assert.equal(s.reviewProgress.events.length, 1);
  }
});
test('imported review enums require primitive strings and never coerce array or object values', () => {
  const s = state(); reviews.applyReview(s, input());
  for (const [field, allowed] of [['status', ['active', 'suspended', 'archived']], ['rating', ['Again', 'Hard', 'Good', 'Easy']]]) {
    for (const malformed of [...allowed.map(value => [value]), { value: allowed[0] }, null, true, 1, 'unknown']) {
      const backup = createBackup(structuredClone(s));
      const target = field === 'status' ? backup.data.reviewProgress.cards[0] : backup.data.reviewProgress.events[0];
      target[field] = malformed;
      const untouched = structuredClone(backup);
      assert.throws(() => validateBackup(backup), /review progress/, `${field}: ${JSON.stringify(malformed)}`);
      assert.deepEqual(backup, untouched);
    }
  }
  for (const status of ['active', 'suspended', 'archived']) {
    const backup = createBackup(structuredClone(s));
    backup.data.reviewProgress.cards[0].status = status;
    assert.deepEqual(validateBackup(backup), backup.data);
  }
  assert.equal(reviews.dueQueue(s, '2026-10-29T00:00:00.000Z', 'Europe/Zurich').due.length, 1);
});
test('integration action shares pending submit and retries failed persistence using same event ID', async () => {
  let committed = state(), calls = 0, release;
  const change = async edit => {
    calls++; const candidate = structuredClone(committed); edit(candidate);
    const success = await new Promise(resolve => { release = resolve; });
    if (success) committed = candidate;
    return success;
  };
  const actions = reviews.createReviewActions(change);
  const failed = actions.submit(input());
  assert.equal(actions.submit(input()), failed); assert.equal(calls, 1);
  await assert.rejects(actions.submit(input('Easy')), /already used/);
  release(false); assert.equal(await failed, false); assert.equal(committed.reviewProgress.events.length, 0);
  const retry = actions.submit(input()); release(true); assert.equal(await retry, true);
  assert.equal(committed.reviewProgress.events.length, 1);
  assert.equal(calls, 2);
});
test('estimated recall is model probability, absent for new cards and decreases with time', () => {
  const s = state(); assert.equal(reviews.estimatedRecall(s.reviewProgress.cards[0], now), undefined);
  reviews.applyReview(s, input('Easy'));
  const card = s.reviewProgress.cards[0];
  const immediately = reviews.estimatedRecall(card, now), later = reviews.estimatedRecall(card, '2026-11-28T08:00:00.000Z');
  assert.ok(immediately <= 1 && immediately > later && later > 0);
});
