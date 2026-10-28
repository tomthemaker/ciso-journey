const { test } = require('node:test');
const assert = require('node:assert/strict');
const base = require('./fixtures/v1/empty.json').data;
const bundle = require('../content/foundation.v1.json');
const now = '2026-10-28T12:00:00.000Z';
const zone = 'Europe/Zurich';
test('local windows cap future instants and keep versioned attempts and retries distinct', async () => {
  const { projectProgress, windowStart } = await import('../src/progress.ts');
  assert.equal(windowStart(now, zone), '2026-09-29');
  const s = structuredClone(base);
  const attempt = (id, submittedAt, version, correct) => ({ id, submittedAt, contentRef: { id: 'question-missing', version }, format: 'mcq', correct });
  s.questionAttempts = { attempts: [attempt('old', '2026-09-28T23:00:00.000Z', 1, false), attempt('retry', '2026-10-02T00:00:00.000Z', 1, true), attempt('new', '2026-10-02T00:00:00.000Z', 2, false), attempt('future', '2026-10-28T13:00:00.000Z', 1, true)], selfAssessments: [] };
  const original = structuredClone(s), p = projectProgress(s, bundle, now, zone);
  // 23:00 UTC is already September 29 locally; the window includes it.
  assert.deepEqual(p.mcq, { total: 3, correct: 1, retries: 1, unique: 2 });
  assert.equal(p.future, 1); assert.equal(p.missingQuestions, 3); assert.equal(p.days[0][0], '2026-09-29');
  assert.deepEqual(s, original);
});
test('FSRS estimate uses last non-future event and observed ratings remain distinct', async () => {
  const reviews = await import('../src/reviews.ts'); const { projectProgress } = await import('../src/progress.ts');
  const s = structuredClone(base), ref = { id: 'card-test', version: 1 };
  reviews.enrollCard(s, ref, '2026-10-28T08:00:00.000Z');
  reviews.applyReview(s, { eventId: 'a', contentRef: ref, rating: 'Again', now: '2026-10-28T08:00:00.000Z', timeZone: zone });
  reviews.applyReview(s, { eventId: 'b', contentRef: ref, rating: 'Hard', now: '2026-10-28T08:01:00.000Z', timeZone: zone });
  reviews.applyReview(s, { eventId: 'c', contentRef: ref, rating: 'Good', now: '2026-10-29T08:00:00.000Z', timeZone: zone });
  const p = projectProgress(s, bundle, now, zone);
  assert.deepEqual(p.reviews, { total: 2, successful: 1, failed: 1, unique: 1 });
  assert.equal(p.estimates.length, 1); assert.equal(p.estimates[0], reviews.estimatedRecall({ ...s.reviewProgress.cards[0], schedule: s.reviewProgress.events[1].after }, now));
  assert.equal(p.future, 1);
});
test('rubric versions and criteria never mix; missing anchors are retained as unavailable', async () => {
  const { projectProgress } = await import('../src/progress.ts');
  const s = structuredClone(base); const refs = bundle.records.filter(r => r.kind === 'rubric' && r.id === 'rubric-foundation-case');
  const make = (ref, id) => ({ id, assessedAt: now, rubricRef: { id: ref.id, version: ref.version }, ratings: [{ criterionId: ref.payload.criteria[0].id, score: ref.payload.criteria[0].levels[0].score }] });
  s.scenarioResponses = { responses: [], selfAssessments: [...refs.map((r, i) => make(r, String(i))), { id: 'missing', assessedAt: now, rubricRef: { id: 'missing', version: 1 }, ratings: [{ criterionId: 'x', score: 1 }] }] };
  const p = projectProgress(s, bundle, now, zone);
  assert.equal(p.assessments.groups.length, refs.length); assert.equal(p.assessments.unavailable, 1);
  assert.notEqual(p.assessments.groups[0].rubric, p.assessments.groups[1].rubric);
  assert.match([...p.assessments.groups[0].anchors.keys()][0], /^2026-10-28 — /);
});
