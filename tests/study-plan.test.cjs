const { test } = require('node:test');
const assert = require('node:assert/strict');
const { personalizedPlan, readingGaps } = require('../src/study-plan.ts');
const { validateStudyPreferences, saveStudyPreferences } = require('../src/study-preferences.ts');
const { validateBackup, createBackup } = require('../src/backup.ts');
const { enrollCard, applyReview } = require('../src/reviews.ts');
const { setRead } = require('../src/reading-progress.ts');
const { latestRecords } = require('../src/content-catalog.ts');
const { createAttempt, appendAttempt } = require('../src/question-attempts.ts');
const { studyBundle: bundle } = require('../scripts/study-content.cjs');
const tasks = require('../curriculum/c01.v1.json').tasks;
const now = '2026-10-29T08:00:00.000Z';
const empty = () => ({ completed: {}, scores: {}, journal: [], achievements: [] });
const prefs = (extra = {}) => ({ schemaVersion: 1, dailyMinutes: 45, goalTaskIds: [], updatedAt: now, ...extra });
const lesson = id => latestRecords(bundle, 'lesson').find(record => record.taskIds.includes(id));

test('cold start is deterministic, useful without enrollment and preserves every learning signal', () => {
  const state = empty(), before = structuredClone(state);
  const a = personalizedPlan(bundle, state, now, tasks), b = personalizedPlan(bundle, state, now, tasks);
  assert.deepEqual(a, b); assert.equal(a.selected.record.id, lesson('w1').id);
  assert(a.selected.reasons.some(reason => reason.includes('roadmap order')));
  assert.equal(a.queue.due.length, 0); assert.equal(a.queue.newCards.length, 0);
  assert.deepEqual(state, before);
});

test('conflicting task goals use stable roadmap order and unmet exact prerequisites rather than goal selection order', () => {
  const state = empty(); state.studyPreferences = prefs({ goalTaskIds: ['w4', 'w2'] });
  const plan = personalizedPlan(bundle, state, now, tasks);
  assert.equal(plan.selected.record.id, lesson('w1').id);
  assert(plan.selected.reasons.some(reason => reason.includes('prerequisite')));
  assert(plan.warnings.some(reason => reason.includes('equal priority')));
  assert.deepEqual(plan.taskGaps, ['w1']);
  state.studyPreferences.goalTaskIds.reverse();
  assert.deepEqual(personalizedPlan(bundle, state, now, tasks), plan);
  // Task completion does not stand in for exact reading participation.
  state.completed.w1 = true;
  assert.equal(personalizedPlan(bundle, state, now, tasks).selected.record.id, lesson('w1').id);
});

test('exact revisions, unavailable prerequisites and cycles never fall back to a convenient current lesson', () => {
  const state = empty(); const a = structuredClone(lesson('w1')), b = structuredClone(lesson('w2'));
  a.payload.prerequisiteRefs = [{ id: b.id, version: b.version }]; b.payload.prerequisiteRefs = [{ id: a.id, version: a.version }];
  const cyclic = { ...bundle, records: [a, b] };
  assert(readingGaps(cyclic, state, a).warnings.some(reason => reason.includes('cycle')));
  const plan = personalizedPlan(cyclic, state, now, [{ id: 'w1', prerequisiteTaskIds: ['w2'] }, { id: 'w2', prerequisiteTaskIds: ['w1'] }]);
  assert.equal(plan.selected, undefined); assert.equal(plan.suggestions.length, 0);
  state.studyPreferences = prefs({ goalTaskIds: ['w1'] });
  assert(personalizedPlan(cyclic, state, now, [{ id: 'w1', prerequisiteTaskIds: ['w2'] }, { id: 'w2', prerequisiteTaskIds: ['w1'] }]).warnings.some(reason => reason.includes('Task prerequisite cycle')));
  b.payload.prerequisiteRefs = [{ id: a.id, version: 99 }];
  const missing = personalizedPlan(cyclic, state, now);
  assert.equal(missing.selected, undefined); assert(missing.warnings.some(reason => reason.includes(`${a.id}@99`)));
  setRead(state, { id: a.id, version: 1 }, true);
  assert.equal(personalizedPlan(cyclic, state, now).selected, undefined);
});

test('scarce time suggests shorter eligible practice, retains over-budget alternatives and honors explicit override with warnings', () => {
  const state = empty(); state.studyPreferences = prefs({ dailyMinutes: 3 });
  let plan = personalizedPlan(bundle, state, now, tasks);
  assert.equal(plan.selected, undefined); assert(plan.suggestions.length > 0);
  assert(plan.warnings.some(reason => reason.includes('No full')));
  setRead(state, lesson('w1'), true);
  plan = personalizedPlan(bundle, state, now, tasks);
  assert.equal(plan.selected.record.kind, 'question'); assert.equal(plan.selected.minutes, 3);
  assert(plan.suggestions.some(item => !item.fits));
  state.studyPreferences.overrideRef = { id: lesson('w4').id, version: lesson('w4').version };
  const before = structuredClone(state);
  plan = personalizedPlan(bundle, state, now, tasks);
  assert.equal(plan.selected.record.id, lesson('w4').id); assert.equal(plan.selected.override, true); assert.equal(plan.selected.fits, false);
  assert(plan.selected.warnings.some(reason => reason.includes('Unread exact prerequisite')));
  assert.deepEqual(state, before);
});

test('marking an advanced lesson read manually does not satisfy its earlier exact reading prerequisites for automatic practice', () => {
  const state = empty(); setRead(state, lesson('w4'), true);
  state.studyPreferences = prefs({ goalTaskIds: ['w4'] });
  const plan = personalizedPlan(bundle, state, now, tasks);
  assert.equal(plan.selected.record.id, lesson('w1').id);
  assert(!plan.suggestions.some(item => ['question', 'scenario'].includes(item.record.kind) && item.record.taskIds.includes('w4')));
});

test('overdue load including unavailable exact cards survives zero remaining budget and settings changes unchanged', () => {
  const state = empty(); const cards = latestRecords(bundle, 'card').slice(0, 4);
  for (const [index, card] of [...cards, { id: 'card-unavailable', version: 19 }].entries()) {
    enrollCard(state, card, now); applyReview(state, { eventId: `synthetic-${index}`, contentRef: card, rating: 'Again', now });
  }
  const history = structuredClone(state.reviewProgress);
  saveStudyPreferences(state, prefs({ dailyMinutes: 1, goalTaskIds: ['w12'] }));
  const plan = personalizedPlan(bundle, state, '2026-11-15T08:00:00.000Z', tasks);
  assert.equal(plan.queue.due.length, 5); assert.equal(plan.remaining, 0); assert.equal(plan.selected, undefined);
  assert(plan.warnings.some(reason => reason.includes('All remain available')));
  assert.deepEqual(state.reviewProgress, history);
  assert.equal(personalizedPlan(bundle, state, '2026-11-16T08:00:00.000Z', tasks).queue.due.length, 5);
});

test('latest exact keyed mistake supports practice without inferring competency; later correct answer removes that signal', () => {
  const state = empty(); setRead(state, lesson('w1'), true);
  const question = latestRecords(bundle, 'question').find(record => record.taskIds.includes('w1') && record.payload.format === 'mcq');
  const wrong = question.payload.options.find(option => option.id !== question.payload.correctOptionId).id;
  appendAttempt(state, createAttempt(bundle, question, wrong, 'synthetic-wrong', now));
  let plan = personalizedPlan(bundle, state, now, tasks);
  assert.equal(plan.selected.record.id, question.id); assert(plan.selected.reasons.some(reason => reason.includes('incorrect')));
  const before = structuredClone(state.scores);
  appendAttempt(state, createAttempt(bundle, question, question.payload.correctOptionId, 'synthetic-correct', '2026-10-29T08:01:00.000Z'));
  plan = personalizedPlan(bundle, state, now, tasks);
  assert(!plan.suggestions.some(item => item.record.id === question.id && item.reasons.some(reason => reason.includes('incorrect'))));
  assert.deepEqual(state.scores, before); assert.deepEqual(state.completed, {});
});

test('only explicit low exact rubric anchors create case feedback; unassessed text or unknown anchors do not', () => {
  const state = empty(), scenario = latestRecords(bundle, 'scenario').find(record => record.id.includes('a02-comp1'));
  assert(scenario);
  const rubric = bundle.records.find(record => record.id === scenario.payload.rubricRef.id && record.version === scenario.payload.rubricRef.version);
  const response = { id: 'synthetic-case', contentRef: scenario, submittedAt: now };
  state.scenarioResponses = { schemaVersion: 1, responses: [response], selfAssessments: [] };
  assert(!personalizedPlan(bundle, state, now).suggestions.some(item => item.record.id === scenario.id));
  state.scenarioResponses.selfAssessments.push({ id: 'synthetic-low', assessedAt: now, responseId: response.id, rubricRef: scenario.payload.rubricRef, ratings: [{ criterionId: rubric.payload.criteria[0].id, score: Math.min(...rubric.payload.criteria[0].levels.map(level => level.score)) }] });
  assert.equal(personalizedPlan(bundle, state, now).selected.record.id, scenario.id);
  state.scenarioResponses.responses.push({ ...response, id: 'synthetic-unassessed-later', submittedAt: '2026-10-29T09:00:00.000Z' });
  assert.equal(personalizedPlan(bundle, state, now).selected.record.id, scenario.id);
  state.scenarioResponses.selfAssessments.push({ id: 'synthetic-later-judgment', assessedAt: '2026-10-29T10:00:00.000Z', responseId: 'synthetic-unassessed-later', rubricRef: scenario.payload.rubricRef, ratings: [{ criterionId: rubric.payload.criteria[0].id, score: Math.max(...rubric.payload.criteria[0].levels.map(level => level.score)) }] });
  assert(!personalizedPlan(bundle, state, now).suggestions.some(item => item.record.id === scenario.id));
  state.scenarioResponses.selfAssessments.pop();
  state.scenarioResponses.selfAssessments[0].ratings[0].score = 999;
  assert(!personalizedPlan(bundle, state, now).suggestions.some(item => item.record.id === scenario.id));
});

test('private preferences validate strict primitives, canonical dates and refs; both backup versions preserve settings and historical choices', () => {
  const state = empty(); saveStudyPreferences(state, prefs({ goalTaskIds: ['w1', 'p6e'], overrideRef: { id: 'lesson-historical', version: 999 } }));
  const backup = createBackup(state);
  for (const version of [1, 2]) assert.deepEqual(validateBackup({ ...backup, version }).studyPreferences, state.studyPreferences);
  const plan = personalizedPlan(bundle, state, now, tasks);
  assert(plan.warnings.some(reason => reason.includes('unavailable for study')));
  for (const bad of [{ dailyMinutes: '30' }, { dailyMinutes: 0 }, { dailyMinutes: 481 }, { goalTaskIds: ['p1a'] }, { goalTaskIds: ['w1', 'w1'] }, { updatedAt: '2026-02-30T00:00:00.000Z' }, { overrideRef: null }, { overrideRef: { id: 'lesson-test', version: '1' } }, { overrideRef: { id: '<script>', version: 1 } }, { schemaVersion: 2 }]) {
    assert.throws(() => validateStudyPreferences(prefs(bad)), /study preferences/);
    assert.throws(() => validateBackup({ ...backup, data: { ...state, studyPreferences: prefs(bad) } }), /study preferences/);
  }
});

test('integrated portfolio self-report and study preferences round-trip together without becoming inferred planner evidence', () => {
  const { appendAppraisal } = require('../src/portfolio.ts');
  const state = structuredClone(require('./fixtures/v1/mixed-progress.json').data);
  saveStudyPreferences(state, prefs({ goalTaskIds: ['w1'] }));
  const baseline = personalizedPlan(bundle, state, now, tasks);
  appendAppraisal(state, { id: 'synthetic-quarter', date: '2026-10-29', competency: 'Governance', level: 'Lead', provenance: 'self-assessment', scope: 'Fictional bounded exercise', rationale: 'Self-reported reflection only', evidenceIds: [], responseIds: [] });
  assert.deepEqual(personalizedPlan(bundle, state, now, tasks), baseline);
  for (const version of [1, 2]) assert.deepEqual(validateBackup({ ...createBackup(state), version }), state);
});
