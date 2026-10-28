import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateContent, effectiveStatus } from '../../scripts/validate-content.mjs';
import { loadCurriculum } from '../../scripts/validate-curriculum.mjs';

const bundle = JSON.parse(readFileSync(new URL('../../content/foundation.v1.json', import.meta.url), 'utf8'));
const lessons = bundle.records.filter(record => record.kind === 'lesson');
const questions = bundle.records.filter(record => record.kind === 'question');
const cards = bundle.records.filter(record => record.kind === 'card');
const asOf = '2026-10-28';
const resolve = reference => bundle.records.find(record => record.id === reference.id && record.version === reference.version);

test('the actual foundation pilot satisfies C02 and retains exact references and provisional provenance', () => {
  assert.deepEqual(validateContent(bundle, { asOf }), []);
  assert.ok(bundle.actors.every(actor => actor.kind === 'ai'));
  assert.ok(bundle.editorial.every(item => item.status === 'draft' && item.reviews.length === 0));
  assert.ok(bundle.records.every(record => effectiveStatus(bundle, record, asOf) === 'draft'));
  assert.ok(bundle.records.every(record => record.legalClaims.length === 0));
});

test('w1–w4 lessons cover all eight C01 objectives through explicit reading, examples and related practice', () => {
  assert.equal(lessons.length, 4);
  const objectives = loadCurriculum().objectives.filter(item => ['w1', 'w2', 'w3', 'w4'].includes(item.taskId));
  assert.equal(objectives.length, 8);
  for (const objective of objectives) {
    const lesson = lessons.find(record => record.taskIds.includes(objective.taskId));
    assert.ok(lesson.objectiveIds.includes(objective.id));
    // These are regression guards for missing teaching components, not pedagogical validation.
    assert.ok(lesson.payload.sections.some(section => section.heading.startsWith(objective.id)));
    assert.ok(lesson.payload.sections.some(section => section.heading.startsWith(`Worked example for ${objective.id}`)));
    assert.ok(lesson.payload.practiceRefs.some(reference => resolve(reference).objectiveIds.includes(objective.id)));
    assert.ok(lesson.payload.conceptRefs.every(reference => resolve(reference).taskIds.includes(objective.taskId)));
    assert.ok(lesson.payload.sections.some(section => section.heading.startsWith('Practice')));
    assert.ok(lesson.payload.sections.some(section => section.body.includes('https://www.linkedin.com/learning/search?')));
  }
});

test('pilot retrieval and questions cover each week across all formats with feedback and anchored practice', () => {
  assert.equal(cards.length, 12);
  assert.equal(questions.length, 20);
  for (const task of ['w1', 'w2', 'w3', 'w4']) {
    assert.equal(cards.filter(card => card.taskIds.includes(task)).length, 3);
    const week = questions.filter(question => question.taskIds.includes(task));
    assert.equal(week.length, 5);
    assert.deepEqual(new Set(week.map(question => question.payload.format)), new Set(['mcq', 'scenario', 'open']));
    for (const question of week) {
      if (question.payload.format === 'mcq') {
        assert.equal(question.payload.options.length, 4);
        assert.ok(question.payload.options.every(option => option.explanation.trim()));
      } else {
        const rubric = resolve(question.payload.rubricRef);
        assert.equal(rubric.payload.assessmentProvenance, 'self-assessment');
        assert.ok(rubric.payload.criteria.every(criterion => criterion.levels.length >= 3));
        assert.ok(question.payload.annotatedExample.includes('Annotation:'));
      }
    }
  }
});

test('the cross-week executive case preserves targets, separate measurements and criterion-based self-feedback', () => {
  const scenario = bundle.records.find(record => record.kind === 'scenario');
  assert.equal(bundle.records.filter(record => record.kind === 'scenario').length, 1);
  assert.deepEqual(scenario.taskIds, ['w1', 'w2', 'w3', 'w4']);
  assert.equal(scenario.objectiveIds.length, 8);
  const rubric = resolve(scenario.payload.rubricRef);
  assert.deepEqual(rubric.payload.criteria.map(criterion => criterion.id), ['risk', 'identity', 'architecture', 'data', 'recovery', 'decision']);
  assert.equal(rubric.payload.assessmentProvenance, 'self-assessment');
  assert.match(scenario.payload.annotatedExample, /RTO.*RPO/s);
  assert.match(scenario.payload.constraints.join(' '), /resource\/task completion, card recall, question attempts and applied assessment distinct/);
});

test('real pilot cannot acquire validated publication through a metadata-only or challenged source', () => {
  const changed = structuredClone(bundle);
  const lesson = changed.records.find(record => record.id === 'lesson-w2-identity');
  const source = changed.records.find(record => record.id === 'source-authentication');
  changed.editorial.find(item => item.ref.id === lesson.id).status = 'source-checked';
  source.payload.verification = 'metadata-only';
  assert.match(validateContent(changed, { asOf }).join('\n'), /source text not checked/);
  source.payload.verification = 'authoritative-text';
  changed.editorial.find(item => item.ref.id === source.id).unresolvedChallenges.push('Substantive authentication claim requires recheck.');
  assert.equal(effectiveStatus(changed, lesson, asOf), 'stale');
  assert.match(validateContent(changed, { asOf }).join('\n'), /overdue\/expired content must be stale/);
});
