const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const bundle = require('../content/foundation.v1.json');
const mixed = require('./fixtures/v1/mixed-progress.json');
let createAttempt, appendAttempt, appendSelfAssessment, validateBackup, createBackup, questionRoute, resolveRubric;
before(async () => {
  ({ createAttempt, appendAttempt, appendSelfAssessment, questionRoute, resolveRubric } = await import('../src/question-attempts.ts'));
  ({ validateBackup, createBackup } = await import('../src/backup.ts'));
});
const mcq = bundle.records.find(r => r.kind === 'question' && r.payload.format === 'mcq');
const constructed = bundle.records.filter(r => r.kind === 'question' && r.payload.format !== 'mcq');
const date = '2026-10-28T10:00:00.000Z';
const make = (question, response, id = 'synthetic-attempt') => createAttempt(bundle, question, response, id, date);
test('keyed MCQ retries append pinned attempts and change no other learning state', () => {
  const state = structuredClone(mixed.data), legacy = structuredClone(state);
  const wrong = mcq.payload.options.find(option => option.id !== mcq.payload.correctOptionId).id;
  const first = make(mcq, wrong);
  appendAttempt(state, first);
  first.response = 'mutated-outside-state';
  appendAttempt(state, make(mcq, mcq.payload.correctOptionId, 'retry'));
  assert.equal(state.questionAttempts.attempts.length, 2);
  const [one, two] = state.questionAttempts.attempts;
  assert.equal(one.response, wrong); assert.equal(one.correct, false); assert.equal(two.correct, true);
  assert.deepEqual(one.contentRef, { id: mcq.id, version: 1 });
  assert.equal(one.contentVersion, bundle.contentVersion);
  assert.equal(one.curriculumVersion, bundle.curriculumVersion);
  assert.deepEqual(one.sourceRefs, mcq.sourceRefs);
  assert.deepEqual(one.objectiveIds, mcq.objectiveIds);
  assert.equal(one.provenance, 'keyed-mcq'); assert.equal(one.rubricRef, null);
  const { questionAttempts, ...rest } = state;
  assert.deepEqual(rest, legacy);
  assert.throws(() => appendAttempt(state, make(mcq, wrong)), /question attempts/);
  assert.deepEqual(state.questionAttempts, questionAttempts);
  assert.throws(() => make(mcq, ''), /answer first/);
  assert.throws(() => make(mcq, 'unknown-option'), /answer first/);
});
test('open/scenario arbitrary prose remains ungraded; explicit exact-rubric assessment appends separately', () => {
  for (const question of constructed) {
    const state = structuredClone(mixed.data);
    appendAttempt(state, make(question, '<img onerror=synthetic> Any prose, no keyword matching.'));
    const saved = structuredClone(state.questionAttempts.attempts);
    assert.equal(saved[0].correct, null); assert.equal(saved[0].provenance, 'unassessed-response');
    const rubric = bundle.records.find(r => r.id === question.payload.rubricRef.id);
    const ratings = rubric.payload.criteria.map(c => ({ criterionId: c.id, score: c.levels.at(-1).score }));
    assert.throws(() => appendSelfAssessment(state, bundle, saved[0].id, [], 'assessment', date), /every criterion/);
    assert.throws(() => appendSelfAssessment(state, bundle, saved[0].id, ratings.map(r => ({ ...r, score: 999 })), 'assessment', date), /every criterion/);
    appendSelfAssessment(state, bundle, saved[0].id, ratings, 'assessment', date);
    assert.deepEqual(state.questionAttempts.attempts, saved);
    assert.equal(state.questionAttempts.selfAssessments[0].provenance, 'self-assessment');
    assert.deepEqual(state.questionAttempts.selfAssessments[0].rubricRef, question.payload.rubricRef);
    assert.throws(() => appendSelfAssessment(state, bundle, saved[0].id, ratings, 'assessment-retry', date), /question attempts/);
    assert.equal(state.questionAttempts.selfAssessments.length, 1);
  }
});
test('v1/v2 backups preserve attempts, historical refs, reading, and compatible extension fields', () => {
  const state = structuredClone(mixed.data);
  state.readingProgress = { schemaVersion: 1, entries: [] };
  appendAttempt(state, make(mcq, 'a'));
  state.questionAttempts.extension = { synthetic: 'retained' };
  const old = state.questionAttempts.attempts[0];
  old.contentRef = { id: 'question-historical', version: 7 };
  old.contentVersion = 'historical-bundle'; old.extension = ['retained'];
  for (const version of [1, 2]) assert.deepEqual(validateBackup({ ...createBackup(state), version }), state);
  for (const version of [1, 2]) assert.deepEqual(validateBackup({ ...mixed, version }), mixed.data);
});
test('imported incompatible or unavailable rubric refs retain selections without resolving unsafe rubric data', () => {
  const state = structuredClone(mixed.data), question = constructed[0];
  appendAttempt(state, make(question, 'Synthetic response'));
  const rubric = resolveRubric(bundle, question.payload.rubricRef);
  assert.equal(rubric.kind, 'rubric');
  const ratings = rubric.payload.criteria.map(c => ({ criterionId: c.id, score: c.levels[0].score }));
  appendSelfAssessment(state, bundle, 'synthetic-attempt', ratings, 'assessment', date);
  for (const reference of [{ id: 'source-security-principles', version: 1 }, { id: 'rubric-unavailable', version: 7 }]) {
    const imported = structuredClone(state);
    imported.questionAttempts.attempts[0].rubricRef = reference;
    imported.questionAttempts.selfAssessments[0].rubricRef = reference;
    assert.deepEqual(validateBackup(createBackup(imported)), imported);
    assert.equal(resolveRubric(bundle, reference), undefined);
    imported.questionAttempts.selfAssessments = [];
    const before = structuredClone(imported);
    assert.throws(() => appendSelfAssessment(imported, bundle, 'synthetic-attempt', ratings, 'assessment', date), /every criterion/);
    assert.deepEqual(imported, before);
  }
});
test('rubric resolution checks criterion and anchor shape before rendering or recording new selections', () => {
  const reference = constructed[0].payload.rubricRef;
  for (const alter of [
    r => { r.payload = null; },
    r => { r.payload.criteria = undefined; },
    r => { r.payload.criteria = {}; },
    r => { r.payload.criteria = [null]; },
    r => { r.payload.criteria[0].description = null; },
    r => { r.payload.criteria[0].levels = undefined; },
    r => { r.payload.criteria[0].levels = [null]; },
    r => { r.payload.criteria[0].levels[0].descriptor = null; },
  ]) {
    const incompatible = structuredClone(bundle);
    alter(incompatible.records.find(r => r.id === reference.id && r.version === reference.version));
    assert.equal(resolveRubric(incompatible, reference), undefined);
    const state = structuredClone(mixed.data);
    appendAttempt(state, make(constructed[0], 'Synthetic response'));
    assert.throws(() => appendSelfAssessment(state, incompatible, 'synthetic-attempt', [], 'assessment', date), /every criterion/);
    assert.deepEqual(state.questionAttempts.selfAssessments, []);
  }
});
test('malformed/future provenance and dangling or duplicate assessment reject entire imports without mutation', () => {
  const state = structuredClone(mixed.data), question = constructed[0];
  appendAttempt(state, make(question, 'Synthetic response'));
  const invalid = [
    p => { p.schemaVersion = 99; },
    p => { p.attempts[0].contentRef.version = 0; },
    p => { p.attempts[0].submittedAt = '2026-02-30T10:00:00.000Z'; },
    p => { p.attempts[0].provenance = 'independent-review'; },
    p => { p.attempts[0].response = '   '; },
    p => { p.attempts[0].correct = true; },
    p => { p.attempts.push(structuredClone(p.attempts[0])); },
    p => { p.selfAssessments.push({ id: 'assessment', attemptId: 'missing', assessedAt: date, rubricRef: question.payload.rubricRef, provenance: 'self-assessment', ratings: [{ criterionId: 'criterion', score: 1 }] }); },
  ];
  for (const edit of invalid) {
    const backup = createBackup(structuredClone(state)); edit(backup.data.questionAttempts);
    const before = structuredClone(backup);
    assert.throws(() => validateBackup(backup), /question attempts/);
    assert.deepEqual(backup, before);
  }
});
test('question hashes require exact safe versions under the Pages navigation namespace', () => {
  assert.deepEqual(questionRoute('#questions/question-w1-1/2'), { id: 'question-w1-1', version: 2 });
  for (const hash of ['#questions', '#questions/a/0', '#questions/a/2e3', '#questions/%3Cimg%3E/1', '#questions/a/9007199254740992']) assert.equal(questionRoute(hash), undefined);
});
