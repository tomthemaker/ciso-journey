import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, validateContent, effectiveStatus, publicationStates } from '../../scripts/validate-content.mjs';

const asOf = '2026-10-28';
const validate = (data, options = {}) => validateContent(data, { asOf, ...options });
const get = (data, id, version = 1) => data.records.find(record => record.id === id && record.version === version);
const status = (data, id, state, version = 1) => { data.editorial.find(item => item.ref.id === id && item.ref.version === version).status = state; };
const rejects = (mutate, expected, options) => {
  const data = loadContent(); mutate(data);
  assert.match(validate(data, options).join('\n'), expected);
};
// Human approvals below are generated test data, never editorial evidence.
const withReviews = () => {
  const data = loadContent();
  data.actors.push({ id: 'test-educator', kind: 'human', role: 'Synthetic educator' });
  data.actors.push({ id: 'test-legal', kind: 'human', role: 'Synthetic legal reviewer' });
  get(data, 'source-nist').payload.verification = 'authoritative-text';
  for (const item of data.editorial) item.reviews = [{ reviewerId: 'test-educator', role: 'educator', reviewedAt: asOf, evidence: 'Synthetic test-only review', verdict: 'approve' }];
  return data;
};

test('synthetic examples cover every entity and question format, retaining draft provenance', () => {
  const data = loadContent();
  assert.deepEqual(validate(data), []);
  assert.equal(new Set(data.records.map(item => item.kind)).size, 8);
  assert.deepEqual(new Set(data.records.filter(item => item.kind === 'question').map(item => item.payload.format)), new Set(['mcq', 'open', 'scenario']));
  assert.ok(data.editorial.every(item => item.status === 'draft' && item.reviews.length === 0));
  assert.deepEqual(publicationStates, ['draft', 'source-checked', 'independently-reviewed', 'published', 'stale', 'retired']);
});
test('untrusted shapes return diagnostics instead of throwing', () => {
  for (const malformed of [null, [], {}, { ...loadContent(), records: {} }, { ...loadContent(), records: [null] }, { ...loadContent(), editorial: [null] }]) {
    assert.ok(validate(malformed).length > 0);
  }
});
test('stable IDs, versioned references and unknown fields validate', () => {
  rejects(data => { data.records[1].id = ''; }, /record.id/);
  rejects(data => { data.records.push(data.records[0]); }, /Duplicate revision/);
  rejects(data => { get(data, 'card-control').payload.conceptRef.version = 99; }, /unknown\/wrong-kind reference/);
  rejects(data => { get(data, 'card-control').payload.mispelled = true; }, /unknown field/);
  rejects(data => { get(data, 'card-control').sourceRefs = [{ id: 'concept-control', version: 1 }]; }, /wrong-kind/);
  rejects(data => { data.curriculumVersion = 'c01-future'; }, /Curriculum version/);
});
test('preserve actual C01 task/objective ownership, ISO granularity and validity windows', () => {
  rejects(data => { get(data, 'card-control').taskIds = ['p1a']; }, /unknown legacy task/);
  rejects(data => { get(data, 'card-control').objectiveIds = ['obj-w2-1']; }, /mismatched C01/);
  rejects(data => { const p = get(data, 'mapping-control').payload; p.frameworkVersionId = 'iso27001-2022-amd2024'; p.targetIds = ['A.8.99']; p.validFrom = null; }, /unsupported framework target/);
  rejects(data => { get(data, 'mapping-control').payload.validUntilExclusive = '2099-01-01'; }, /preserve C01 validity/);
});
test('every option needs an explanation; open/scenario responses use rubric and annotated examples', () => {
  rejects(data => { get(data, 'question-classify').payload.options[1].explanation = ''; }, /explanation/);
  rejects(data => { get(data, 'question-classify').payload.correctOptionId = 'unknown'; }, /invalid correct answer/);
  rejects(data => { get(data, 'question-explain').payload.rubricRef = null; }, /requires rubric/);
  rejects(data => { get(data, 'question-scenario').payload.correctOptionId = 'match this text'; }, /cannot use exact-text/);
  rejects(data => { get(data, 'rubric-classify').payload.criteria[0].levels[1].score = 0; }, /distinct anchored scores/);
});
test('lessons require original sections, practice and acyclic prerequisites', () => {
  rejects(data => { get(data, 'lesson-controls').payload.sections = []; }, /sections/);
  rejects(data => { get(data, 'lesson-controls').payload.prerequisiteRefs = [{ id: 'lesson-controls', version: 1 }]; }, /prerequisite cycle/);
  rejects(data => { get(data, 'lesson-controls').payload.practiceRefs = [{ id: 'card-control', version: 1 }]; }, /practice must/);
});
test('metadata-only sources and AI reviews cannot advance the publication gate', () => {
  rejects(data => { status(data, 'card-control', 'source-checked'); }, /source text not checked/);
  rejects(data => { status(data, 'card-control', 'independently-reviewed'); }, /independent educator approval required/);
  rejects(data => { data.editorial[0].reviews.push({ reviewerId: 'ai-drafter', role: 'educator', reviewedAt: asOf, evidence: 'Author checks own draft', verdict: 'approve' }); }, /separate human/);
  const data = withReviews();
  get(data, 'card-control').authorIds.push('test-educator');
  status(data, 'card-control', 'independently-reviewed');
  assert.match(validate(data).join('\n'), /separate human/);
});
test('independent and published states require current sources, educator approval and published dependencies', () => {
  const data = withReviews();
  status(data, 'card-control', 'independently-reviewed');
  assert.deepEqual(validate(data), []);
  status(data, 'card-control', 'published');
  assert.match(validate(data).join('\n'), /dependency .* not currently published/);
  for (const item of data.editorial) item.status = 'published';
  assert.deepEqual(validate(data), []);
  data.editorial[0].unresolvedChallenges.push('Substantive source dispute');
  assert.match(validate(data).join('\n'), /unresolved source\/review challenge/);
});
test('invalid dates, unsafe/non-primary URLs and overlong cadence are rejected', () => {
  rejects(data => { get(data, 'source-nist').payload.checkedAt = '2026-02-30'; }, /checkedAt/);
  rejects(data => { get(data, 'source-nist').payload.url = 'javascript:alert(1)'; }, /url/);
  rejects(data => { get(data, 'source-nist').payload.url = 'https://example.com/article'; }, /primary publisher/);
  rejects(data => { get(data, 'source-nist').payload.reviewDueAt = '2029-01-01'; }, /cadence exceeded/);
});
test('expiry propagates; CISM and CISSP boundary dates are exclusive', () => {
  const data = withReviews();
  for (const item of data.editorial) item.status = 'published';
  assert.equal(effectiveStatus(data, get(data, 'card-control'), '2027-10-27'), 'stale');
  assert.match(validate(data, { asOf: '2027-10-27' }).join('\n'), /must be stale/);
  for (const [frameworkVersionId, validFrom, boundary] of [['cism-2022', null, '2026-11-03'], ['cissp-2024', '2024-04-15', '2027-04-15']]) {
    Object.assign(get(data, 'mapping-control').payload, { frameworkVersionId, targetIds: ['1'], validFrom, validUntilExclusive: boundary });
    assert.equal(effectiveStatus(data, get(data, 'mapping-control'), boundary), 'stale');
  }
});
const sourceFailures = {
  overdue: data => { get(data, 'source-nist').payload.reviewDueAt = asOf; },
  challenged: data => { data.editorial.find(item => item.ref.id === 'source-nist').unresolvedChallenges.push('Synthetic substantive source challenge'); },
  'changes-requested': data => { data.editorial.find(item => item.ref.id === 'source-nist').reviews[0].verdict = 'changes-requested'; },
};
for (const current of ['source-checked', 'independently-reviewed']) for (const [failure, mutate] of Object.entries(sourceFailures)) {
  test(`${current} rejects ${failure} source evidence even when its editorial status is draft`, () => {
    const data = withReviews();
    const source = get(data, 'source-nist'), card = get(data, 'card-control');
    status(data, card.id, current);
    assert.deepEqual(validate(data), []);
    mutate(data);
    assert.equal(effectiveStatus(data, source, asOf), 'draft');
    assert.equal(effectiveStatus(data, card, asOf), 'stale');
    assert.ok(validate(data).includes('card-control@1: overdue/expired content must be stale'));
  });
}
test('published dependents also propagate draft-source expiry and challenges', () => {
  for (const mutate of Object.values(sourceFailures)) {
    const data = withReviews();
    for (const item of data.editorial) item.status = 'published';
    assert.deepEqual(validate(data), []);
    status(data, 'source-nist', 'draft');
    mutate(data);
    assert.equal(effectiveStatus(data, get(data, 'card-control'), asOf), 'stale');
    assert.ok(validate(data).includes('card-control@1: overdue/expired content must be stale'));
  }
});
test('source evidence failures retain draft presentation and addressable historical revisions', () => {
  for (const mutate of Object.values(sourceFailures)) {
    const data = withReviews();
    mutate(data);
    for (const state of ['draft', 'stale', 'retired']) {
      status(data, 'card-control', state);
      assert.equal(effectiveStatus(data, get(data, 'card-control'), asOf), state);
      assert.deepEqual(validate(data, { previous: structuredClone(data), attempts: [{ id: 'historic', contentRef: { id: 'card-control', version: 1 } }] }), []);
    }
  }
});
test('legal draft stays provisional until new authoritative text verification and independent legal approval', () => {
  const data = withReviews();
  const source = get(data, 'source-nist');
  Object.assign(source.payload, { publisher: 'Swiss Confederation', url: 'https://www.fedlex.admin.ch/eli/cc/2022/491/en', sourceKind: 'authoritative-law', c01SourceId: 'src-fadp', jurisdiction: 'Switzerland', verification: 'metadata-only', reviewDueAt: '2027-01-25' });
  const card = get(data, 'card-control');
  card.legalClaims.push({ statement: 'Synthetic placeholder, not legal advice.', jurisdiction: 'Switzerland', sector: 'Fictional', applicability: 'Requires actual applicability analysis.', effectiveAt: '2026-10-28', sourceRef: { id: source.id, version: 1 }, locator: 'Placeholder; no real article asserted.' });
  assert.deepEqual(validate(data), []);
  status(data, card.id, 'source-checked');
  assert.match(validate(data).join('\n'), /verified authoritative text/);
  source.payload.verification = 'authoritative-text';
  assert.match(validate(data).join('\n'), /new human text verification/);
  source.payload.checkedAt = asOf; source.payload.verifierId = 'test-legal';
  status(data, card.id, 'independently-reviewed');
  assert.match(validate(data).join('\n'), /independent legal approval/);
  data.editorial.find(item => item.ref.id === card.id).reviews.push({ reviewerId: 'test-legal', role: 'legal', reviewedAt: asOf, evidence: 'Synthetic test-only legal review', verdict: 'approve' });
  assert.deepEqual(validate(data), []);
});
test('correction retains old payload and attempt reference; destructive rewrites and removal fail', () => {
  const previous = loadContent(), data = loadContent();
  const corrected = structuredClone(get(data, 'card-control'));
  corrected.version = 2;
  corrected.supersedes = { id: corrected.id, version: 1 };
  corrected.payload.answer = 'State residual exposure and uncertainty before choosing a safeguard.';
  corrected.changeNote = 'Clarifies decision context; preserve the prior retrieval answer.';
  data.records.push(corrected);
  data.editorial.push({ ref: { id: corrected.id, version: 2 }, status: 'draft', reviews: [], unresolvedChallenges: [] });
  const attempts = [{ id: 'synthetic-retrieval', contentRef: { id: 'card-control', version: 1 } }];
  assert.deepEqual(validate(data, { previous, attempts }), []);
  get(data, 'card-control').payload.answer = 'Overwritten';
  assert.match(validate(data, { previous, attempts }).join('\n'), /Immutable revision removed\/changed/);
  data.records = data.records.filter(record => !(record.id === 'card-control' && record.version === 1));
  assert.match(validate(data, { previous, attempts }).join('\n'), /original content version unavailable/);
});
test('corrections require consecutive versions, change notes and impact statements', () => {
  rejects(data => { get(data, 'concept-control', 2).supersedes.version = 0; }, /supersedes/);
  rejects(data => { get(data, 'concept-control', 2).changeNote = ''; }, /changeNote/);
  rejects(data => { get(data, 'concept-control', 2).priorAttemptImpact = ''; }, /priorAttemptImpact/);
  rejects(data => { get(data, 'concept-control', 2).scheduleImpact = ''; }, /scheduleImpact/);
});
test('stale and retired revisions stay addressable without claiming current approval', () => {
  const data = loadContent();
  status(data, 'concept-control', 'retired');
  status(data, 'source-nist', 'stale');
  assert.deepEqual(validate(data, { attempts: [{ id: 'historic', contentRef: { id: 'concept-control', version: 1 } }] }), []);
});
