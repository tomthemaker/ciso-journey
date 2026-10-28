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

test('each constructed response resolves criteria for its own requested output and objective', () => {
  // These are the requested assessment dimensions, not keyed answer text. A full-week
  // rubric cannot silently add unrelated work to a short question again.
  const scopes = {
    'w1-3': ['classification', 'cia', 'ambiguity'],
    'w1-4': ['chains', 'controls', 'uncertainty'],
    'w1-5': ['correction', 'risk-chain', 'evidence'],
    'w2-3': ['lifecycle', 'decisions'],
    'w2-4': ['paths', 'factors'],
    'w2-5': ['rollout', 'residual-risk'],
    'w3-3': ['flows', 'boundaries'],
    'w3-4': ['comparison', 'controls'],
    'w3-5': ['bounded-decision', 'tests'],
    'w4-3': ['handling', 'authorised-user'],
    'w4-4': ['measurement', 'safe-restore', 'evidence-follow-up'],
    'w4-5': ['honest-report', 'capability-limits'],
  };
  for (const [suffix, criteria] of Object.entries(scopes)) {
    const question = questions.find(record => record.id === `question-${suffix}`);
    const rubric = resolve(question.payload.rubricRef);
    assert.equal(rubric.id, `rubric-${suffix.slice(0, 2)}-question-${suffix.at(-1)}`);
    assert.deepEqual(rubric.objectiveIds, question.objectiveIds);
    assert.deepEqual(rubric.taskIds, question.taskIds);
    assert.deepEqual(rubric.payload.criteria.map(criterion => criterion.id), criteria);
    assert.ok(rubric.payload.criteria.every(criterion => criterion.levels.some(level => level.score === 2)));
  }
});

test('classification and one-chain feedback cannot require the full weekly artifact', () => {
  const criteria = id => resolve(questions.find(record => record.id === id).payload.rubricRef).payload.criteria;
  const classification = criteria('question-w1-3');
  assert.doesNotMatch(JSON.stringify(classification), /chains?|control owner|two services/i);
  assert.match(classification.find(item => item.id === 'classification').levels.at(-1).descriptor, /all six/i);
  assert.match(classification.find(item => item.id === 'cia').levels.at(-1).descriptor, /unsupported confidentiality/i);

  const correction = criteria('question-w1-5');
  const chain = correction.find(item => item.id === 'risk-chain');
  assert.match(chain.levels.at(-1).descriptor, /one chain/i);
  assert.doesNotMatch(JSON.stringify(correction), /two chains|fewer than two|classif/i);
  assert.match(correction.find(item => item.id === 'evidence').levels.at(-1).descriptor, /two distinct/i);
  // The larger weekly practice still intentionally asks for two chains.
  assert.match(resolve({ id: 'rubric-w1', version: 1 }).payload.criteria.find(item => item.id === 'chains').levels[0].descriptor, /fewer than two chains/);
});

test('short response anchors exclude unrelated weekly work while examples retain requested evidence', () => {
  const excluded = {
    'question-w2-4': /joiner|mover|leaver|emergency/i,
    'question-w2-5': /joiner|mover|leaver|three paths/i,
    'question-w3-3': /flat design|two controls|rollback/i,
    'question-w3-5': /two flows|three boundaries|two controls/i,
    'question-w4-3': /RTO|RPO|hash|restore exercise/i,
    'question-w4-5': /isolated environment|key custody|classification|design a.*restore/i,
  };
  for (const [id, unrelatedWork] of Object.entries(excluded)) {
    const question = questions.find(record => record.id === id);
    assert.doesNotMatch(JSON.stringify(resolve(question.payload.rubricRef).payload), unrelatedWork, id);
  }
  const example = id => questions.find(record => record.id === id).payload.annotatedExample;
  assert.match(example('question-w2-3'), /application owner verifies allowed reporting actions and denied former support actions/);
  assert.match(example('question-w3-3'), /customer session.*scoped API identity.*admin context.*workload identity.*scoped recovery identity/s);
  assert.match(example('question-w3-5'), /preserves dispatch but can admit a compromised terminal/);
  assert.match(example('question-w4-4'), /recoverable update’s age at simulated disruption against RPO/);
});

test('the cross-week executive case preserves targets, separate measurements and criterion-based self-feedback', () => {
  const scenario = bundle.records.find(record => record.kind === 'scenario');
  assert.equal(new Set(bundle.records.filter(record => record.kind === 'scenario').map(record => record.id)).size, 1);
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

test('A01 appends an optional executive case and six Recognize/Explain/Apply/Lead criteria without replacing v1', () => {
  const scenario = resolve({ id: 'scenario-foundation-decision', version: 2 });
  const original = resolve({ id: scenario.id, version: 1 });
  assert.deepEqual(scenario.supersedes, { id: original.id, version: 1 });
  assert.equal(scenario.payload.brief, original.payload.brief);
  assert.deepEqual(scenario.objectiveIds, original.objectiveIds);
  assert.deepEqual(original.payload.rubricRef, { id: 'rubric-foundation-case', version: 1 });
  const rubric = resolve(scenario.payload.rubricRef);
  assert.equal(rubric.payload.assessmentProvenance, 'self-assessment');
  assert.deepEqual(rubric.payload.criteria.map(c => c.id), ['impact', 'options', 'accountability', 'recommendation', 'residual-risk', 'evidence']);
  for (const criterion of rubric.payload.criteria) {
    assert.deepEqual(criterion.levels.map(l => l.score), [1, 2, 3, 4]);
    assert.deepEqual(criterion.levels.map(l => l.descriptor.split(':')[0]), ['Recognize', 'Explain', 'Apply', 'Lead']);
  }
  assert.match(scenario.payload.annotatedExample, /Option A.*Option B.*tradeoff/s);
  assert.match(scenario.payload.annotatedExample, /RTO.*3h15m.*90 minutes.*RPO/s);
  assert.match(scenario.payload.annotatedExample, /no independent review/);
  assert.match(scenario.priorAttemptImpact, /original scenario and rubric/);
});
