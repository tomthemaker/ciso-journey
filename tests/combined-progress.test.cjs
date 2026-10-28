const { test } = require('node:test');
const assert = require('node:assert/strict');
const mixed = require('./fixtures/v1/mixed-progress.json');
const bundle = require('../content/foundation.v1.json');

test('combined reading/resource/question/review backup retains independent histories and validates every namespace', async () => {
  const { validateBackup, createBackup } = await import('../src/backup.ts');
  const { setRead } = await import('../src/reading-progress.ts');
  const { saveResourceProgress, editResource } = await import('../src/resource-progress.ts');
  const { createAttempt, appendAttempt, appendSelfAssessment } = await import('../src/question-attempts.ts');
  const { enrollCard, applyReview, setCardStatus } = await import('../src/reviews.ts');
  const state = structuredClone(mixed.data);
  const now = '2026-10-28T08:00:00.000Z';
  setRead(state, { id: 'lesson-historical-synthetic', version: 7 }, true);
  const resource = { id: 'custom-combined-synthetic', taskId: 'w1', isCustom: true, title: 'Synthetic reference', platform: 'Synthetic publisher', url: 'https://example.org/reference', type: 'reference' };
  saveResourceProgress(state, resource, { status: 'completed', completedAt: '2026-10-28', notes: 'Synthetic notes', evidenceUrl: 'https://example.org/evidence' });
  editResource(state, resource, { ...resource, archived: true });
  const question = bundle.records.find(record => record.kind === 'question' && record.payload.format !== 'mcq');
  appendAttempt(state, createAttempt(bundle, question, 'Synthetic response', 'combined-attempt', now));
  const rubric = bundle.records.find(record => record.id === question.payload.rubricRef.id && record.version === question.payload.rubricRef.version);
  appendSelfAssessment(state, bundle, 'combined-attempt', rubric.payload.criteria.map(criterion => ({ criterionId: criterion.id, score: criterion.levels[0].score })), 'combined-assessment', now);
  const ref = { id: 'card-historical-synthetic', version: 2 };
  enrollCard(state, ref, now);
  const siblings = structuredClone(state);
  delete siblings.reviewProgress;
  const answer = { eventId: 'combined-review', contentRef: ref, rating: 'Good', now, timeZone: 'Europe/Zurich' };
  const event = applyReview(state, answer);
  setCardStatus(state, ref, 'archived');
  enrollCard(state, { ...ref, version: 3 }, now);
  const { reviewProgress, ...unchanged } = state;
  assert.deepEqual(unchanged, siblings);
  assert.deepEqual(state.completed, mixed.data.completed);
  assert.deepEqual(state.scores, mixed.data.scores);
  assert.deepEqual(reviewProgress.events[0], event);
  for (const namespace of ['readingProgress', 'resourceProgress', 'questionAttempts', 'reviewProgress']) {
    state[namespace].syntheticExtension = { retained: ['literal <script>text</script>'] };
  }
  for (const version of [1, 2]) {
    const backup = JSON.parse(JSON.stringify({ ...createBackup(state), version }));
    const restored = validateBackup(backup);
    assert.deepEqual(restored, state);
    assert.deepEqual(applyReview(restored, answer), event);
    assert.deepEqual(restored, state); // Durable retry cannot change any restored namespace.
    for (const namespace of ['readingProgress', 'resourceProgress', 'questionAttempts', 'reviewProgress']) {
      const invalid = structuredClone(backup);
      invalid.data[namespace].schemaVersion = 99;
      const before = structuredClone(invalid);
      assert.throws(() => validateBackup(invalid), /progress|question attempts/);
      assert.deepEqual(invalid, before);
      assert.deepEqual(restored, state);
    }
  }
  assert.deepEqual(validateBackup(mixed), mixed.data);
});
