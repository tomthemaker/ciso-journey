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
import { appendAttempt, appendSelfAssessment, createAttempt } from '../../src/question-attempts.ts';
import { createBackup, validateBackup } from '../../src/backup.ts';

const previous = studyInputs[0].bundle;
const asOf = '2026-10-29';
const empty = () => ({ completed: {}, scores: {}, journal: [], achievements: [] });

// Original provisional foundation delivery remains pinned when advanced artifacts are appended.
const foundationPins = {
  "docs/curriculum/drafts/w5.json": {
    "sha256": "de12093165a096a12a28244011ea6f4c2cba7b028f8436b14c0480fba4c145af",
    "commit": "dbf06e650d3631c5e6cf4e35205ba54147f027aa"
  },
  "docs/curriculum/drafts/w6.json": {
    "sha256": "01697fae4c0c21993d5f20a1659b62802b515b5b4eef9854dbf1175b431f5aac",
    "commit": "d340db02913ed0036ce7fbd1c9bb039d0ba16403"
  },
  "docs/curriculum/drafts/w7.json": {
    "sha256": "48bbd87baa33d991bf014b6c84c7d945b28d9cc79532caa6d8164751749ae1e1",
    "commit": "8788c41ed170b08a7dca36451e04e1dd59db3475"
  },
  "docs/curriculum/drafts/w8.json": {
    "sha256": "6d6e0d5a93ef7edadc5072466f10051c05e1ddea5e9aa517899929419f7b57c4",
    "commit": "d0fa697ed2ba7d278e1c2ec275aea04e79ff6a59"
  },
  "docs/curriculum/drafts/w9.json": {
    "sha256": "6ca1e7064431fa9f2a3a98c787296440f266acd05964be2c01e63edf64d9b3b4",
    "commit": "505aa71cfd0d8073392a9766de30f6730f8f0745"
  },
  "docs/curriculum/drafts/w10.json": {
    "sha256": "cf7b3606d3892478eec80ad46399ce64bdc4908064c1ad8e69bcfe56dfc0d267",
    "commit": "b2eac05a494617d095159956af9bc909f37bf802"
  },
  "docs/curriculum/drafts/w11.json": {
    "sha256": "d676c7f7e98f4f5e79fb65e9781366b793e644dc045e866c3a03d195d65454bf",
    "commit": "2e3bfcb2eb3b3e248e021adfc034ff714f3ce00e"
  },
  "docs/curriculum/drafts/w12.json": {
    "sha256": "155e0bbcabcaacacb3a7785886f47aa476cf44093641e204fb089b75d41eef3e",
    "commit": "f9c983a13cfab983ec01fb9fa1ba9145920e10d9"
  },
  "docs/curriculum/drafts/a02-comp1.json": {
    "sha256": "713270fc0c3b46b5a8e3964246d964fb5dd7ce5fb23697c51d9de29375e956c7",
    "commit": "8634e9b8ee49ad0c9261cf76f873d05b48698c9e"
  },
  "docs/curriculum/drafts/a02-comp2.json": {
    "sha256": "5bcb18e6356dd48c12b5ceaa173409d2156c4fd202bcb5cac3c6a624611a856b",
    "commit": "0fcbed51f65053349847ab6ef4b4f9f5a7097378"
  },
  "docs/curriculum/drafts/a02-comp3.json": {
    "sha256": "9d5425e8dfb6b9e9bcc57afc240837fa74066017c916c6994b31ab5873d77f66",
    "commit": "f61ff2fd671e9b68f16a89777a95e12d77d7a28f"
  },
  "docs/curriculum/drafts/a02-comp4.json": {
    "sha256": "0426956de5f2cfbd4af9f2e172596df32240344ad69f03969e7d6d985806ff75",
    "commit": "276ba69e68cd2ad0f0a7e75b9ccc2d4010f65cf9"
  },
  "docs/curriculum/drafts/a02-comp5.json": {
    "sha256": "759bb817848180e64bef19bebe4b025bdc60f8b1b35dabf2cdb6e095454a13ff",
    "commit": "5381084b3b520c84962f36a0f25ed0df00b6925e"
  },
  "docs/curriculum/drafts/a02-comp6.json": {
    "sha256": "23bd244ac7354a70011c14ba6763456bc2ddc36158dc07eb2fc405f13ffcd214",
    "commit": "90acd9680005fb21fe049edb9b15994f92430984"
  }
};
const foundationInputs = studyInputs.filter(({ artifact }) => artifact === studyManifest.baseline || artifact.path in foundationPins);
const deliveredFoundation = composeContent('provisional-study-2026-10-29.1', foundationInputs.map(input => input.bundle));

test('original 14 artifacts and all additions compose with immutable foundation records, provenance and attempt refs', () => {
  assert.equal(foundationInputs.length, 15); // baseline plus exactly the fourteen original artifacts
  assert.equal(studyManifest.baseline.sha256, 'dc82e76a1e6c3bfb7e103a2f495507c9f318959a19043e6b0a7c5fe55a542b0c');
  for (const [path, pin] of Object.entries(foundationPins)) {
    const artifact = studyManifest.artifacts.find(item => item.path === path);
    assert(artifact, path);
    assert.equal(artifact.sha256, pin.sha256, path);
    assert.equal(artifact.commit, pin.commit, path);
  }
  assert.equal(previous.records.length, 139);
  assert.equal(deliveredFoundation.records.length, 341);
  assert.equal(bundle.records.length, studyInputs.reduce((count, input) => count + input.bundle.records.length, 0));
  const attempts = deliveredFoundation.records.map((record, index) => ({ id: `synthetic-prior-${index}`, contentRef: { id: record.id, version: record.version } }));
  assert.deepEqual(validateContent(bundle, { previous: deliveredFoundation, attempts, asOf }), []);
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
  const lessons = latestRecords(bundle, 'lesson').filter(lesson => /^w\d+$/.test(lesson.taskIds[0]));
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
  assert.equal(latestRecords(deliveredFoundation, 'question').length, 60);
  assert.equal(latestRecords(deliveredFoundation, 'card').length, 41);
  assert.equal(latestRecords(deliveredFoundation, 'scenario').length, 15);
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

test('every current question accepts exact authored option IDs or constructed responses and round-trips its rubric history', () => {
  const state = JSON.parse(readFileSync(new URL('../fixtures/v1/empty.json', import.meta.url), 'utf8')).data;
  const before = structuredClone(state);
  const now = '2026-10-29T10:00:00.000Z';
  for (const question of latestRecords(bundle, 'question')) {
    if (question.payload.format === 'mcq') {
      for (const option of question.payload.options) {
        const attempt = createAttempt(bundle, question, option.id, `synthetic-${question.id}-${option.id}`, now);
        appendAttempt(state, attempt);
        assert.equal(attempt.response, option.id);
        assert.equal(attempt.correct, option.id === question.payload.correctOptionId);
      }
      assert.throws(() => createAttempt(bundle, question, 'synthetic-not-an-option', 'synthetic-invalid', now), /Attempt an answer first/);
    } else {
      const attempt = createAttempt(bundle, question, 'Synthetic original response with decision and uncertainty.', `synthetic-${question.id}`, now);
      appendAttempt(state, attempt);
      const rubric = findContent(bundle, question.payload.rubricRef);
      appendSelfAssessment(state, bundle, attempt.id, rubric.payload.criteria.map(criterion => ({ criterionId: criterion.id, score: criterion.levels[0].score })), `synthetic-assessment-${question.id}`, now);
      assert.equal(attempt.correct, null);
    }
  }
  assert(state.questionAttempts.attempts.some(attempt => attempt.response === '2'));
  assert.deepEqual(validateBackup(createBackup(state)), state);
  const { questionAttempts, ...unchanged } = state;
  assert.deepEqual(unchanged, before);
  assert.equal(questionAttempts.selfAssessments.length, latestRecords(bundle, 'question').filter(question => question.payload.format !== 'mcq').length);
});

test('composition rejects conflicting provenance, duplicate revisions and incompatible curriculum snapshots', () => {
  assert.throws(() => composeContent('synthetic', [previous, previous]), /Duplicate content revision/);
  const actorConflict = { ...previous, records: [], editorial: [], actors: [{ ...previous.actors[0], role: 'Synthetic conflicting role' }] };
  assert.throws(() => composeContent('synthetic', [previous, actorConflict]), /Conflicting actor/);
  assert.throws(() => composeContent('synthetic', [previous, { ...previous, curriculumVersion: 'future' }]), /share their schema/);
});

test('p2a extends the exact w9 prerequisite with five-decision practice and scoped assessment', () => {
  const lessons = taskContent(bundle, 'p2a', 'lesson');
  assert.equal(lessons.length, 1);
  const lesson = lessons[0];
  assert.deepEqual(lesson.objectiveIds, ['obj-p2a-1']);
  assert.deepEqual(lesson.payload.prerequisiteRefs, [{ id: 'lesson-w9-governance', version: 1 }]);
  assert.equal(findContent(bundle, lesson.payload.prerequisiteRefs[0]).kind, 'lesson');
  const questions = taskContent(bundle, 'p2a', 'question');
  assert.equal(questions.length, 5);
  assert.deepEqual(questions.map(question => question.payload.format).sort(), ['mcq', 'mcq', 'open', 'scenario', 'scenario']);
  assert.equal(taskContent(bundle, 'p2a', 'card').length, 4);
  const rubricIds = questions.filter(question => question.payload.format !== 'mcq').map(question => question.payload.rubricRef.id);
  assert.equal(new Set(rubricIds).size, 3);
  assert(!rubricIds.includes('rubric-p2a-five-decisions'));
  const scenario = taskContent(bundle, 'p2a', 'scenario')[0];
  assert(lesson.payload.practiceRefs.some(ref => contentKey(ref) === contentKey(scenario)));
  for (const criterion of findContent(bundle, scenario.payload.rubricRef).payload.criteria) {
    assert.deepEqual(criterion.levels.map(level => level.score), [1, 2, 3, 4]);
    assert.deepEqual(criterion.levels.map(level => level.descriptor.split(':')[0]), ['Recognize', 'Explain', 'Apply', 'Lead']);
  }
  const state = empty();
  for (const prior of latestRecords(bundle, 'lesson').filter(record => /^w\d+$/.test(record.taskIds[0]))) setRead(state, prior, true);
  assert.equal(todayPlan(bundle, state, '2026-10-29T10:00:00.000Z').lesson.id, lesson.id);
});
