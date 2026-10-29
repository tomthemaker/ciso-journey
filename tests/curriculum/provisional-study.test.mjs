import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { studyBundle as bundle, studyInputs, studyManifest } from '../../scripts/study-content.mjs';
import { validateContent } from '../../scripts/validate-content.mjs';
import { loadCurriculum } from '../../scripts/validate-curriculum.mjs';
import { composeContent, latestRecords, taskContent } from '../../src/content-catalog.ts';
import { contentKey, findContent } from '../../src/content.ts';
import { contentRefs } from '../../src/content-status.ts';
import { todayPlan } from '../../src/today-plan.ts';
import { setRead } from '../../src/reading-progress.ts';
import { enrollCard } from '../../src/reviews.ts';

const previous = studyInputs[0].bundle;
const asOf = '2026-10-29';
const empty = () => ({ completed: {}, scores: {}, journal: [], achievements: [] });

test('all 14 pinned artifacts compose with immutable baseline records, actor/editorial equality and old attempt refs', () => {
  assert.equal(studyManifest.artifacts.length, 14);
  assert.equal(previous.records.length, 139);
  assert.equal(bundle.records.length, 341);
  const attempts = previous.records.map((record, index) => ({ id: `synthetic-prior-${index}`, contentRef: { id: record.id, version: record.version } }));
  assert.deepEqual(validateContent(bundle, { previous, attempts, asOf }), []);
  const ids = new Set(previous.records.map(record => record.id));
  for (const { artifact, bundle: source } of studyInputs) {
    const bytes = readFileSync(new URL(`../../${artifact.path}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), artifact.sha256, artifact.path);
    assert.equal(source.contentVersion, artifact.contentVersion);
    assert.equal(source.records.length, artifact.records);
    for (const record of source.records) {
      assert.deepEqual(findContent(bundle, record), record, contentKey(record));
      const refs = contentRefs(record).map(contentKey);
      assert.equal(new Set(refs).size, refs.length, `${contentKey(record)} repeated dependency`);
      if (source !== previous) { assert(!ids.has(record.id), record.id); ids.add(record.id); }
    }
    for (const actor of source.actors) assert.deepEqual(bundle.actors.find(item => item.id === actor.id), actor);
    for (const editorial of source.editorial) assert.deepEqual(bundle.editorial.find(item => contentKey(item.ref) === contentKey(editorial.ref)), editorial);
  }
  assert(bundle.editorial.every(item => item.status === 'draft' && item.reviews.length === 0));
  assert(bundle.actors.every(actor => actor.kind === 'ai'));
});

test('actual twelve-week catalog covers all foundation objectives, question formats and pinned prerequisites/practice', () => {
  const lessons = latestRecords(bundle, 'lesson');
  assert.deepEqual(lessons.map(lesson => lesson.taskIds[0]), Array.from({ length: 12 }, (_, index) => `w${index + 1}`));
  const objectives = loadCurriculum().objectives.filter(objective => /^w\d+$/.test(objective.taskId));
  assert.equal(objectives.length, 24);
  for (const lesson of lessons) {
    for (const objective of objectives.filter(item => lesson.taskIds.includes(item.taskId))) assert(lesson.objectiveIds.includes(objective.id));
    for (const ref of lesson.payload.prerequisiteRefs) assert.equal(findContent(bundle, ref).kind, 'lesson');
    assert(lesson.payload.practiceRefs.some(ref => findContent(bundle, ref).kind === 'question'));
    assert(taskContent(bundle, lesson.taskIds[0], 'scenario').length);
    const questions = taskContent(bundle, lesson.taskIds[0], 'question');
    assert.deepEqual(new Set(questions.map(question => question.payload.format)), new Set(['mcq', 'scenario', 'open']));
    assert(taskContent(bundle, lesson.taskIds[0], 'card').length >= 3);
    for (const question of questions) {
      if (question.payload.format === 'mcq') assert(question.payload.options.every(option => option.explanation.trim()));
      else assert.equal(findContent(bundle, question.payload.rubricRef).kind, 'rubric');
    }
  }
  assert.equal(latestRecords(bundle, 'question').length, 60);
  assert.equal(latestRecords(bundle, 'card').length, 41);
  assert.equal(latestRecords(bundle, 'scenario').length, 15);
  const competencyCases = latestRecords(bundle, 'scenario').filter(record => record.id.startsWith('scenario-a02-'));
  assert.equal(competencyCases.length, 6);
  for (const scenario of competencyCases) {
    assert(scenario.taskIds.every(id => taskContent(bundle, id, 'scenario').includes(scenario)));
    assert.equal(findContent(bundle, scenario.payload.rubricRef).payload.assessmentProvenance, 'self-assessment');
  }
});

test('Today progresses beyond the pilot, uses exact authored practice and never changes learner state', () => {
  const state = empty();
  const lessons = latestRecords(bundle, 'lesson');
  for (const lesson of lessons.slice(0, 4)) setRead(state, lesson, true);
  const before = structuredClone(state);
  let plan = todayPlan(bundle, state, '2026-10-29T10:00:00.000Z');
  assert.equal(plan.lesson.taskIds[0], 'w5');
  assert.deepEqual(state, before);
  for (const lesson of lessons.slice(4)) {
    const card = taskContent(bundle, lesson.taskIds[0], 'card')[0];
    const isolated = empty(); enrollCard(isolated, card, '2026-10-29T10:00:00.000Z');
    plan = todayPlan(bundle, isolated, '2026-10-29T10:00:00.000Z');
    assert.equal(contentKey(plan.lesson), contentKey(lesson));
    assert(lesson.payload.practiceRefs.some(ref => contentKey(ref) === contentKey(plan.question)));
    assert(lesson.payload.practiceRefs.some(ref => contentKey(ref) === contentKey(plan.scenario)));
  }
  // A read latest revision cannot satisfy an authored prerequisite pinned to an older revision.
  const changed = structuredClone(bundle);
  const w5 = changed.records.find(record => record.id === 'lesson-w5-cloud');
  w5.payload.prerequisiteRefs = [{ id: 'lesson-w3-architecture', version: 1 }];
  assert.equal(todayPlan(changed, state, '2026-10-29T10:00:00.000Z').lesson.taskIds[0], 'w6');
});

test('composition rejects conflicting provenance, duplicate revisions and incompatible curriculum snapshots', () => {
  assert.throws(() => composeContent('synthetic', [previous, previous]), /Duplicate content revision/);
  const actorConflict = { ...previous, records: [], editorial: [], actors: [{ ...previous.actors[0], role: 'Synthetic conflicting role' }] };
  assert.throws(() => composeContent('synthetic', [previous, actorConflict]), /Conflicting actor/);
  assert.throws(() => composeContent('synthetic', [previous, { ...previous, curriculumVersion: 'future' }]), /share their schema/);
});
