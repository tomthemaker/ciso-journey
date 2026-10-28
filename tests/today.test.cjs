const { test } = require('node:test');
const assert = require('node:assert/strict');
const { todayPlan, availableCard, cardsForBulkEnrollment } = require('../src/today-plan.ts');
const { enrollCard, applyReview, setNewCardLimit, setCardStatus } = require('../src/reviews.ts');
const bundle = require('../content/foundation.v1.json');
const cards = bundle.records.filter(record => record.kind === 'card');
const empty = () => ({ completed: {}, scores: {}, journal: [], achievements: [] });
const now = '2026-10-28T08:00:00.000Z';

test('bulk enrollment does not silently add a new schedule for an existing card ID', () => {
  for (const status of ['active', 'suspended', 'archived']) {
    const state = empty(), original = cards[0], revised = { ...original, version: original.version + 1 };
    enrollCard(state, original, now);
    applyReview(state, { eventId: 'old-revision', contentRef: original, rating: 'Good', now });
    setCardStatus(state, original, status);
    const history = structuredClone(state.reviewProgress);
    assert.deepEqual(cardsForBulkEnrollment([revised, cards[1]], state).map(card => card.id), [cards[1].id]);
    assert.deepEqual(state.reviewProgress, history);
    enrollCard(state, revised, now);
    assert.deepEqual(state.reviewProgress.events, history.events);
    assert.deepEqual(state.reviewProgress.cards[0], history.cards[0]);
    assert.equal(state.reviewProgress.cards[1].schedule.reps, 0);
  }
});

test('Today chooses the overdue lesson and related question/case before an unread lesson; capped new work stays separate', () => {
  const state = empty(), later = cards.find(record => record.taskIds[0] === 'w2');
  enrollCard(state, cards[0], now); enrollCard(state, later, now);
  applyReview(state, { eventId: 'later', contentRef: later, rating: 'Again', now });
  setNewCardLimit(state, 0);
  const plan = todayPlan(bundle, state, '2026-11-01T08:00:00.000Z', 'Europe/Zurich');
  assert.deepEqual(plan.due.map(card => card.contentRef.id), [later.id]);
  assert.equal(plan.newCards.length, 0);
  assert.equal(plan.lesson.taskIds[0], 'w2');
  assert(plan.question.taskIds.includes('w2'));
  assert(plan.scenario.taskIds.includes('w2'));
  assert.equal(plan.reviewMinutes, 1);
  assert.equal(plan.readingMinutes, plan.lesson.payload.estimatedMinutes);
  assert.equal(plan.questionMinutes, 3); assert.equal(plan.caseMinutes, 15);
  assert.deepEqual(state.completed, {}); assert.equal(state.readingProgress, undefined);
});
test('Today excludes unavailable exact answers without rewriting or losing due histories; restoring retains overdue work', () => {
  const state = empty(), ref = { id: 'card-not-installed', version: 10 };
  enrollCard(state, ref, now);
  applyReview(state, { eventId: 'missing', contentRef: ref, rating: 'Good', now });
  enrollCard(state, cards[0], now);
  const copy = structuredClone(state);
  let plan = todayPlan(bundle, state, '2026-11-10T08:00:00.000Z');
  assert.equal(plan.unavailable, 1); assert.equal(plan.due.length, 0); assert.equal(plan.newCards.length, 1);
  assert.equal(availableCard(bundle, ref), undefined);
  assert.equal(availableCard(bundle, bundle.records.find(record => record.kind === 'lesson')), undefined);
  assert.deepEqual(state, copy);
  setCardStatus(state, cards[0], 'archived'); assert.equal(todayPlan(bundle, state, now).newCards.length, 0);
  setCardStatus(state, cards[0], 'active'); assert.equal(todayPlan(bundle, state, '2026-11-10T08:00:00.000Z').newCards.length, 1);
});
test('Today repeats an available question only after all related questions have attempts and stops counting completed reading', () => {
  const state = empty(), first = todayPlan(bundle, state, now);
  const lesson = first.lesson;
  state.readingProgress = { schemaVersion: 1, entries: [{ contentRef: lesson, completed: true }] };
  state.questionAttempts = { schemaVersion: 1, attempts: [{ contentRef: first.question }], selfAssessments: [] };
  enrollCard(state, cards[0], now);
  const next = todayPlan(bundle, state, now);
  assert.equal(next.readingMinutes, 0);
  assert.notEqual(next.question.id, first.question.id);
  assert(next.question.taskIds.some(id => lesson.taskIds.includes(id)));
});
