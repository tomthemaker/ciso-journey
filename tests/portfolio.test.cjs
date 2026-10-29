const { test } = require('node:test');
const assert = require('node:assert/strict');
const { appendEvidence, appendAppraisal, quarter } = require('../src/portfolio.ts');
const { createBackup, validateBackup } = require('../src/backup.ts');
const mixed = require('./fixtures/v1/mixed-progress.json');
const evidence = { id: 'synthetic-evidence', title: 'Synthetic register', url: 'https://example.test/register', notes: '<script>literal</script>' };
const appraisal = { id: 'synthetic-appraisal', date: '2026-03-31', competency: 'Governance', level: 'Apply', provenance: 'self-assessment', scope: 'Fictional pilot', rationale: 'Applied to the bounded pilot', evidenceIds: ['synthetic-evidence'], responseIds: [] };
test('portfolio appends history and round trips through v1 and v2 without changing legacy state or extensions', () => {
  const state = structuredClone(mixed.data), before = structuredClone(state);
  appendEvidence(state, evidence); appendAppraisal(state, appraisal);
  appendAppraisal(state, { ...appraisal, id: 'correction', date: '2026-04-01', level: 'Explain' });
  state.portfolio.extension = { retained: true };
  assert.equal(quarter(appraisal.date), '2026 Q1');
  assert.equal(state.portfolio.appraisals.length, 2);
  const { portfolio, ...legacy } = state; assert.deepEqual(legacy, before);
  for (const version of [1, 2]) assert.deepEqual(validateBackup({ ...createBackup(state), version }), state);
});
test('rejects unsupported or malformed portfolio and dangling references before backup replacement', () => {
  const state = structuredClone(mixed.data); appendEvidence(state, evidence); appendAppraisal(state, appraisal);
  const edits = [p => p.schemaVersion = 2, p => p.evidence[0].url = 'javascript:alert(1)', p => p.evidence[0].notes = {}, p => p.evidence.push(p.evidence[0]), p => p.appraisals[0].date = '2026-02-30', p => p.appraisals[0].level = 'mastery', p => p.appraisals[0].provenance = 'independent-review', p => p.appraisals[0].scope = '', p => p.appraisals[0].competency = 'Invented', p => p.appraisals[0].evidenceIds = ['missing'], p => p.appraisals[0].responseIds = ['missing']];
  for (const edit of edits) { const backup = createBackup(structuredClone(state)); edit(backup.data.portfolio); const before = structuredClone(backup); assert.throws(() => validateBackup(backup), /portfolio/); assert.deepEqual(backup, before); }
});
test('saved case response references round-trip with exact historical scenario and rubric pins', () => {
  const { appendScenarioResponse, createScenarioResponse, resolveScenario } = require('../src/scenario-responses.ts');
  const bundle = require('../content/foundation.v1.json');
  const scenarioRecord = bundle.records.find(r => r.kind === 'scenario');
  const scenario = resolveScenario(bundle, scenarioRecord);
  const state = structuredClone(mixed.data);
  appendScenarioResponse(state, createScenarioResponse(bundle, scenario, { impact: 'Synthetic', options: 'Synthetic', accountableOwner: 'Synthetic', recommendation: 'Synthetic', residualRisk: 'Synthetic', evidence: { title: 'Synthetic', url: '', notes: '' } }, 'case-one', '2026-03-01T00:00:00.000Z'));
  appendAppraisal(state, { ...appraisal, evidenceIds: [], responseIds: ['case-one'] });
  const restored = validateBackup(createBackup(state));
  assert.deepEqual(restored.scenarioResponses.responses[0].contentRef, { id: scenario.id, version: scenario.version });
  assert.deepEqual(restored.scenarioResponses.responses[0].rubricRef, scenario.payload.rubricRef);
  assert.deepEqual(restored.portfolio.appraisals[0].responseIds, ['case-one']);
});
