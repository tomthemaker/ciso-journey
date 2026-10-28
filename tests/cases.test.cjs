const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const bundle = require('../content/foundation.v1.json');
const mixed = require('./fixtures/v1/mixed-progress.json');
let createScenarioResponse, appendScenarioResponse, appendCaseSelfAssessment, validateBackup, createBackup, resolveScenario, caseRoute;
before(async () => {
  ({ createScenarioResponse, appendScenarioResponse, appendCaseSelfAssessment, resolveScenario, caseRoute } = await import('../src/scenario-responses.ts'));
  ({ validateBackup, createBackup } = await import('../src/backup.ts'));
});
const scenario = bundle.records.find(r => r.kind === 'scenario' && r.version === 2);
const rubric = bundle.records.find(r => r.id === scenario.payload.rubricRef.id && r.version === 2);
const date = '2026-10-28T10:00:00.000Z';
const response = () => ({ impact: 'Synthetic service impact', options: 'Two bounded options', accountableOwner: 'Fictional COO', recommendation: 'One pilot with day-14 checkpoint', residualRisk: 'Approved-session misuse remains', evidence: { title: 'Synthetic worksheet', url: 'https://example.test/private-reference', notes: '<img src=x onerror=synthetic> literal notes' } });
const make = (id = 'synthetic-response', item = response()) => createScenarioResponse(bundle, scenario, item, id, date);
const ratings = () => rubric.payload.criteria.map(c => ({ criterionId: c.id, score: c.levels.at(-1).score }));
test('case retries append exact-version unassessed responses without changing other progress or prior evidence', () => {
  const state = structuredClone(mixed.data), before = structuredClone(state), external = make();
  appendScenarioResponse(state, external); external.response.evidence.notes = 'mutated outside';
  appendScenarioResponse(state, make('retry', { ...response(), recommendation: 'Different bounded choice' }));
  const [first, retry] = state.scenarioResponses.responses;
  assert.equal(first.response.evidence.notes, response().evidence.notes);
  assert.equal(first.provenance, 'unassessed-response');
  assert.deepEqual(first.contentRef, { id: scenario.id, version: 2 });
  assert.deepEqual(first.rubricRef, scenario.payload.rubricRef);
  assert.equal(first.contentVersion, bundle.contentVersion); assert.equal(first.curriculumVersion, bundle.curriculumVersion);
  assert.deepEqual(first.sourceRefs, scenario.sourceRefs); assert.deepEqual(first.objectiveIds, scenario.objectiveIds);
  assert.notEqual(first.response.recommendation, retry.response.recommendation);
  const { scenarioResponses, ...rest } = state; assert.deepEqual(rest, before);
  assert.throws(() => appendScenarioResponse(state, make()), /case responses/);
  assert.deepEqual(state.scenarioResponses, scenarioResponses);
});
test('only explicit complete exact-rubric self-assessment is stored, separately from immutable responses', () => {
  const state = structuredClone(mixed.data); appendScenarioResponse(state, make());
  const responses = structuredClone(state.scenarioResponses.responses);
  for (const invalid of [[], ratings().slice(1), ratings().map(r => ({ ...r, score: 999 })), ratings().map(r => ({ ...r, criterionId: 'wrong' }))]) {
    assert.throws(() => appendCaseSelfAssessment(state, bundle, 'synthetic-response', invalid, 'assessment', date), /every criterion/);
  }
  appendCaseSelfAssessment(state, bundle, 'synthetic-response', ratings(), 'assessment', date);
  assert.deepEqual(state.scenarioResponses.responses, responses);
  assert.equal(state.scenarioResponses.selfAssessments[0].provenance, 'self-assessment');
  assert.deepEqual(state.scenarioResponses.selfAssessments[0].rubricRef, scenario.payload.rubricRef);
  assert.throws(() => appendCaseSelfAssessment(state, bundle, 'synthetic-response', ratings(), 'another', date), /case responses/);
  assert.equal(state.scenarioResponses.selfAssessments.length, 1);
});
test('v1/v2 full backups retain evidence, opaque extensions and unavailable historical refs with all learning namespaces', () => {
  const state = structuredClone(mixed.data); appendScenarioResponse(state, make());
  state.readingProgress = { schemaVersion: 1, entries: [] };
  state.questionAttempts = { schemaVersion: 1, attempts: [], selfAssessments: [] };
  state.resourceProgress = { schemaVersion: 1, entries: [] };
  appendCaseSelfAssessment(state, bundle, 'synthetic-response', ratings(), 'assessment', date);
  state.scenarioResponses.extension = { retained: true };
  const old = state.scenarioResponses.responses[0];
  old.contentRef = { id: 'scenario-unavailable', version: 77 }; old.contentVersion = 'historical-bundle';
  old.rubricRef = { id: 'source-csf', version: 1 }; old.extension = [1, 'retained']; old.response.evidence.extension = 'retained';
  state.scenarioResponses.selfAssessments[0].rubricRef = old.rubricRef;
  for (const version of [1, 2]) assert.deepEqual(validateBackup({ ...createBackup(state), version }), state);
  assert.equal(resolveScenario(bundle, old.contentRef), undefined);
  const before = structuredClone(state);
  assert.throws(() => appendCaseSelfAssessment(state, bundle, old.id, ratings(), 'another', date), /every criterion/);
  assert.deepEqual(state, before);
});
test('malformed, future or forged assessment imports reject completely, including unsafe evidence URLs', () => {
  const state = structuredClone(mixed.data); appendScenarioResponse(state, make());
  appendCaseSelfAssessment(state, bundle, 'synthetic-response', ratings(), 'assessment', date);
  const edits = [
    p => p.schemaVersion = 2, p => p.responses = {}, p => p.responses[0].submittedAt = '2026-02-30T10:00:00.000Z',
    p => p.responses[0].provenance = 'independent-review', p => p.responses[0].contentRef.version = 0,
    p => p.responses[0].response.impact = ' ', p => p.responses[0].response.evidence.title = '',
    p => p.responses[0].response.evidence.notes = {}, p => p.responses.push(p.responses[0]),
    p => p.selfAssessments[0].responseId = 'missing', p => p.selfAssessments[0].provenance = 'independent-review',
    p => p.selfAssessments[0].assessedAt = '2026-10-27T10:00:00.000Z', p => p.selfAssessments[0].rubricRef.version = 1,
    p => p.selfAssessments[0].ratings.push(p.selfAssessments[0].ratings[0]), p => p.selfAssessments[0].ratings[0].score = 1.5,
    ...['javascript:alert(1)', 'data:text/html,test', 'http://example.test', 'https://user:secret@example.test'].map(url => p => p.responses[0].response.evidence.url = url),
  ];
  for (const edit of edits) {
    const backup = createBackup(structuredClone(state)); edit(backup.data.scenarioResponses); const before = structuredClone(backup);
    assert.throws(() => validateBackup(backup), /case responses/); assert.deepEqual(backup, before);
  }
  for (const url of ['', 'https://example.test/private?literal=%3Cimg%3E']) assert.doesNotThrow(() => make('valid', { ...response(), evidence: { ...response().evidence, url } }));
});
test('historical scenario resolution requires the scenario kind and complete compatible payload', () => {
  assert.equal(resolveScenario(bundle, { id: 'source-csf', version: 1 }), undefined);
  for (const alter of [r => r.payload = null, r => r.payload.brief = null, r => r.payload.constraints = [null], r => r.payload.rubricRef = null, r => r.payload.annotatedExample = undefined]) {
    const changed = structuredClone(bundle); alter(changed.records.find(r => r.id === scenario.id && r.version === 2));
    assert.equal(resolveScenario(changed, scenario), undefined);
  }
});
test('exact case routes reject unsafe IDs and unsupported numeric versions', () => {
  assert.deepEqual(caseRoute('#cases/scenario-foundation-decision/2'), { id: scenario.id, version: 2 });
  for (const route of ['#cases', '#cases/test/0', '#cases/test/2e3', '#cases/%3Cimg%3E/1', '#cases/test/9007199254740992']) assert.equal(caseRoute(route), undefined);
});
